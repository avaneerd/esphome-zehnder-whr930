#pragma once

#include "esphome/core/component.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/fan/fan.h"
#include "esphome/core/log.h"


namespace esphome {
namespace whr930 {

static const char *const TAG = "whr930_fan";

enum FanType { EXHAUST = 1, SUPPLY = 2, BOTH = 3 };

inline FanType operator&(FanType a, FanType b)
{
    return static_cast<FanType>(static_cast<int>(a) & static_cast<int>(b));
}

class Whr930Fan : public PollingComponent, public fan::Fan {
 public:
  Whr930Fan(Whr930 *whr930, FanType fan_type) :
    whr930_(whr930),
    PollingComponent(60000) {
      ESP_LOGCONFIG(TAG, "fan_type_: %d", fan_type);
      ESP_LOGCONFIG(TAG, "fan_type_ == BOTH: %d", fan_type_ == FanType::BOTH);
      ESP_LOGCONFIG(TAG, "fan_type_ & EXHAUST: %d", fan_type & FanType::EXHAUST);
      ESP_LOGCONFIG(TAG, "fan_type_ & EXHAUST == EXHAUST: %d", fan_type & FanType::EXHAUST == FanType::EXHAUST);
      is_exhaust = fan_type & FanType::EXHAUST == FanType::EXHAUST;
      is_supply = fan_type & FanType::SUPPLY == FanType::SUPPLY;
     }

  const uint8_t get_command_byte = 0xCD;
  const uint8_t expected_response_byte = 0xCE;
  const uint8_t min_speed_level = 45;
  const uint8_t max_speed_level = 100;
  const uint8_t exhaust_data_index = 1;
  const uint8_t supply_data_index = 4;
  bool is_exhaust;
  bool is_supply;
  uint8_t response_bytes[13];
  uint8_t data_bytes[10] = { 15, 45, 75, 15, 45, 75, 100, 100, 1, 1 };

  void update() override {
    if (this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      int data_index = is_exhaust ? exhaust_data_index : supply_data_index;
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

    if ((is_exhaust && is_supply) || this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      data_bytes[exhaust_data_index] = is_exhaust ? this->speed : response_bytes[exhaust_data_index];
      data_bytes[supply_data_index] = is_supply ? this->speed : response_bytes[supply_data_index];
      this->whr930_->execute_command(command_byte, data_bytes, 10);
    }

    this->publish_state();
  }
};

}
}