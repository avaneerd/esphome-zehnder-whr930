#pragma once

#include "esphome/core/component.h"
#include "esphome/core/log.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/fan/fan.h"


namespace esphome {
namespace whr930 {

static constexpr const char *FAN_TAG = "whr930.fan";

enum FanType { EXHAUST = 1, SUPPLY = 2, BOTH = 3 };

inline FanType operator&(FanType a, FanType b)
{
    return static_cast<FanType>(static_cast<int>(a) & static_cast<int>(b));
}

class Whr930Fan : public PollingComponent, public fan::Fan {
 public:
  Whr930Fan(Whr930 *whr930, FanType fan_type) :
    PollingComponent(60000),  // Staggered: fan=60s
    whr930_(whr930) {
      is_exhaust_ = (fan_type & FanType::EXHAUST) == FanType::EXHAUST;
      is_supply_ = (fan_type & FanType::SUPPLY) == FanType::SUPPLY;
     }

  void update() override {
    if (this->whr930_->execute_request(get_command_byte_, 0, 0, expected_response_byte_, response_bytes_)) {
      // Read current running speed (not configured level)
      int data_index = is_exhaust_ ? exhaust_current_index_ : supply_current_index_;
      this->speed = response_bytes_[data_index];
      this->state = true;
      this->publish_state();
    } else {
      ESP_LOGW(FAN_TAG, "Failed to read fan speed");
    }
  }

  void dump_config() override {
    ESP_LOGCONFIG(FAN_TAG, "WHR930 Fan:");
    ESP_LOGCONFIG(FAN_TAG, "  Exhaust: %s", this->is_exhaust_ ? "yes" : "no");
    ESP_LOGCONFIG(FAN_TAG, "  Supply: %s", this->is_supply_ ? "yes" : "no");
  }

  fan::FanTraits get_traits() override {
    return fan::FanTraits(false, true, false, 100);
  }

 protected:
  Whr930 *whr930_;
  bool is_exhaust_;
  bool is_supply_;

  static const uint8_t exhaust_current_index_ = 7;
  static const uint8_t supply_current_index_ = 8;
  static const uint8_t exhaust_write_index_ = 1;
  static const uint8_t supply_write_index_ = 4;
  static const uint8_t min_speed_level_ = 45;
  static const uint8_t max_speed_level_ = 100;
  static const uint8_t get_command_byte_ = 0xCD;
  static const uint8_t expected_response_byte_ = 0xCE;

  uint8_t response_bytes_[14];  // 0xCE returns 14 data bytes
  uint8_t data_bytes_[9] = { 15, 45, 75, 15, 45, 75, 100, 100, 0 };  // 0xCF takes 9 data bytes

  void control(const fan::FanCall &call) override {
    const uint8_t command_byte = 0xCF;

    if (!call.get_speed().has_value()) {
      return;
    }

    int new_speed = *call.get_speed();

    if (new_speed < min_speed_level_ || new_speed > max_speed_level_) {
      return;
    }

    if (this->speed == new_speed) {
      return;
    }

    int old_speed = this->speed;
    this->speed = new_speed;

    // Always read current configuration from the device before writing
    if (!this->whr930_->execute_request(get_command_byte_, 0, 0, expected_response_byte_, response_bytes_)) {
      ESP_LOGW(FAN_TAG, "Failed to read current fan speeds before setting new speed");
      this->speed = old_speed;
      return;
    }

    // Copy current configured levels from response into write buffer (indices 0-6 match)
    for (int i = 0; i < 7; i++) {
      data_bytes_[i] = response_bytes_[i];
    }

    // Set the target speed in the "low" preset slot
    if (is_exhaust_) data_bytes_[exhaust_write_index_] = this->speed;
    if (is_supply_) data_bytes_[supply_write_index_] = this->speed;

    if (!this->whr930_->execute_command(command_byte, data_bytes_, 9)) {
      ESP_LOGW(FAN_TAG, "Failed to set fan speed to %d", new_speed);
      this->speed = old_speed;
      return;
    }

    this->publish_state();
  }
};

}
}