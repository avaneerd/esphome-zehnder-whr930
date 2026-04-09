#pragma once

#include "esphome/core/component.h"
#include "esphome/core/log.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/fan/fan.h"


namespace esphome {
namespace whr930 {

static const char *FAN_TAG = "whr930.fan";

enum FanType { EXHAUST = 1, SUPPLY = 2, BOTH = 3 };

inline FanType operator&(FanType a, FanType b)
{
    return static_cast<FanType>(static_cast<int>(a) & static_cast<int>(b));
}

class Whr930Fan : public PollingComponent, public fan::Fan {
 public:
  Whr930Fan(Whr930 *whr930, FanType fan_type) :
    PollingComponent(60000),
    whr930_(whr930) {
      is_exhaust = (fan_type & FanType::EXHAUST) == FanType::EXHAUST;
      is_supply = (fan_type & FanType::SUPPLY) == FanType::SUPPLY;
     }

  const uint8_t get_command_byte = 0xCD;
  const uint8_t expected_response_byte = 0xCE;
  const uint8_t min_speed_level = 45;
  const uint8_t max_speed_level = 100;
  // Read indices for current running speed (from 0xCE response, 14 data bytes)
  const uint8_t exhaust_current_index = 7;
  const uint8_t supply_current_index = 8;
  // Write indices for configured level (for 0xCF write command, maps to "low" preset)
  const uint8_t exhaust_write_index = 1;
  const uint8_t supply_write_index = 4;
  bool is_exhaust;
  bool is_supply;
  uint8_t response_bytes[14];  // 0xCE returns 14 data bytes
  uint8_t data_bytes[9] = { 15, 45, 75, 15, 45, 75, 100, 100, 0 };  // 0xCF takes 9 data bytes

  void update() override {
    if (this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      // Read current running speed (not configured level)
      int data_index = is_exhaust ? exhaust_current_index : supply_current_index;
      this->speed = response_bytes[data_index];
      this->state = true;
      this->publish_state();
    } else {
      ESP_LOGW(FAN_TAG, "Failed to read fan speed");
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
      // Copy current configured levels from response into write buffer (indices 0-6 match)
      if (!(is_exhaust && is_supply)) {
        for (int i = 0; i < 7; i++) {
          data_bytes[i] = response_bytes[i];
        }
      }
      // Set the target speed in the "low" preset slot
      if (is_exhaust) data_bytes[exhaust_write_index] = this->speed;
      if (is_supply) data_bytes[supply_write_index] = this->speed;
      if (!this->whr930_->execute_command(command_byte, data_bytes, 9)) {
        ESP_LOGW(FAN_TAG, "Failed to set fan speed to %d", new_speed);
      }
    } else {
      ESP_LOGW(FAN_TAG, "Failed to read current fan speeds before setting new speed");
    }

    this->publish_state();
  }
};

}
}