#pragma once

#include "esphome/core/component.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/fan/fan.h"
#include "esphome/core/log.h"


namespace esphome {
namespace whr930 {

static const char *const TAG = "whr930_fan";

enum class FanType { EXHAUST = 1, SUPPLY = 2, BOTH = 3 };

inline FanType operator&(FanType a, FanType b)
{
    return static_cast<FanType>(static_cast<int>(a) & static_cast<int>(b));
}

class Whr930Fan : public PollingComponent, public fan::Fan {
 public:
  Whr930Fan(Whr930 *whr930, FanType fan_type) :
    whr930_(whr930),
    fan_type_(&fan_type),
    PollingComponent(60000) { }

  const uint8_t get_command_byte = 0xCD;
  const uint8_t expected_response_byte = 0xCE;
  const uint8_t min_speed_level = 45;
  const uint8_t max_speed_level = 100;
  uint8_t response_bytes[13];
  uint8_t data_bytes[10] = { 15, 45, 75, 15, 45, 75, 100, 100, 1, 1 };

  void update() override {
    if (this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      int data_index = (*fan_type_ & FanType::EXHAUST) == FanType::EXHAUST ? 1 : 4;

      ESP_LOGCONFIG(TAG, "fan_type_: %d", fan_type_);
      ESP_LOGCONFIG(TAG, "*fan_type_: %d", *fan_type_);
      ESP_LOGCONFIG(TAG, "*fan_type_: %d", FanType::EXHAUST);
      ESP_LOGCONFIG(TAG, "*fan_type_: %d", (*fan_type_ & FanType::EXHAUST));
      ESP_LOGCONFIG(TAG, "*fan_type_: %d", ((*fan_type_) & FanType::EXHAUST));
      ESP_LOGCONFIG(TAG, "*fan_type_: %d", ((*fan_type_) & FanType::EXHAUST) == FanType::EXHAUST);
      ESP_LOGCONFIG(TAG, "*fan_type_: %d", (*fan_type_ & FanType::EXHAUST) == FanType::EXHAUST);


      this->speed = response_bytes[data_index];
      this->state = true;
      this->publish_state();
    }
  }

  fan::FanTraits get_traits() override {
    return fan::FanTraits(false, true, false, 100);
  }

 protected:
  Whr930 *whr930_;
  FanType *fan_type_;
  void control(const fan::FanCall &call) override {
    const uint8_t command_byte = 0xCF;
    const uint8_t expected_response_byte = 0xCE;

    if (!call.get_speed().has_value()) {
      return;
    }

    int new_speed = *call.get_speed();

    if (new_speed < min_speed_level || new_speed > max_speed_level) {
      return;
    }

    if (this->speed == new_speed) {
      return;
    }

    this->speed = new_speed;

    if ((*fan_type_ & FanType::BOTH) == FanType::BOTH || this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      data_bytes[1] = (*fan_type_ & FanType::EXHAUST) == FanType::EXHAUST ? this->speed : response_bytes[1];
      data_bytes[4] = (*fan_type_ & FanType::SUPPLY) == FanType::SUPPLY ? this->speed : response_bytes[1];
      this->whr930_->execute_command(command_byte, data_bytes, 10);
    }

    this->publish_state();
  }
};

}
}