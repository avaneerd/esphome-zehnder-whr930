#pragma once

#include "esphome/core/component.h"
#include "esphome/core/log.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/button/button.h"

namespace esphome {
namespace whr930 {

static constexpr const char *BUTTON_TAG = "whr930.button";

class Whr930ResetFilterButton : public Component, public button::Button {
 public:
  Whr930ResetFilterButton(Whr930 *whr930) : whr930_(whr930) {}

  void dump_config() override {
    ESP_LOGCONFIG(BUTTON_TAG, "WHR930 Reset Filter Button");
  }

 protected:
  Whr930 *whr930_;

  void press_action() override {
    // Command 0xDB: Reset/Self-test
    // Byte[0]=reset faults, Byte[1]=reset settings, Byte[2]=self-test, Byte[3]=reset filter hours
    uint8_t data[4] = {0x00, 0x00, 0x00, 0x01};
    if (this->whr930_->execute_command(0xDB, data, 4)) {
      ESP_LOGI(BUTTON_TAG, "Filter hours reset successfully");
    } else {
      ESP_LOGW(BUTTON_TAG, "Failed to reset filter hours");
    }
  }
};

}
}
