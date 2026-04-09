#pragma once

#include "esphome/core/component.h"
#include "esphome/core/log.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/select/select.h"

namespace esphome {
namespace whr930 {

static const char *SELECT_TAG = "whr930.select";

class Whr930VentilationLevel : public PollingComponent, public select::Select {
 public:
  Whr930VentilationLevel(Whr930 *whr930) :
    PollingComponent(60000),
    whr930_(whr930) {
      this->traits.set_options({"Auto", "Absent", "Low", "Medium", "High"});
    }

  void update() override {
    // Read current ventilation level from 0xCE response byte[9] (current level)
    if (this->whr930_->execute_request(get_levels_command_, 0, 0, levels_response_, levels_response_bytes_)) {
      uint8_t current_level = levels_response_bytes_[9];
      const char *level_name = level_to_name_(current_level);
      if (level_name != nullptr) {
        this->publish_state(level_name);
      } else {
        ESP_LOGW(SELECT_TAG, "Unknown ventilation level: %d", current_level);
      }
    } else {
      ESP_LOGW(SELECT_TAG, "Failed to read current ventilation level");
    }
  }

 protected:
  Whr930 *whr930_;

  const uint8_t get_levels_command_ = 0xCD;
  const uint8_t levels_response_ = 0xCE;
  uint8_t levels_response_bytes_[14];

  void control(const std::string &value) override {
    uint8_t level = name_to_level_(value);
    if (level == 0xFF) {
      ESP_LOGW(SELECT_TAG, "Invalid ventilation level: %s", value.c_str());
      return;
    }

    // Command 0x99: Set ventilation level (1 data byte)
    if (this->whr930_->execute_command(0x99, &level, 1)) {
      this->publish_state(value);
      ESP_LOGD(SELECT_TAG, "Ventilation level set to %s (0x%02X)", value.c_str(), level);
    } else {
      ESP_LOGW(SELECT_TAG, "Failed to set ventilation level to %s", value.c_str());
    }
  }

  const char *level_to_name_(uint8_t level) {
    switch (level) {
      case 0x00: return "Auto";
      case 0x01: return "Absent";
      case 0x02: return "Low";
      case 0x03: return "Medium";
      case 0x04: return "High";
      default: return nullptr;
    }
  }

  uint8_t name_to_level_(const std::string &name) {
    if (name == "Auto") return 0x00;
    if (name == "Absent") return 0x01;
    if (name == "Low") return 0x02;
    if (name == "Medium") return 0x03;
    if (name == "High") return 0x04;
    return 0xFF;  // Invalid
  }
};

}
}
