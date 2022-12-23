#pragma once

#include "esphome/core/component.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/fan/fan.h"


namespace esphome {
namespace whr930 {

enum class FanType { EXHAUST = 0, SUPPLY = 1 };

class Whr930Fan : public PollingComponent, public fan::Fan {
 public:
  Whr930Fan(Whr930 *whr930) : whr930_(whr930), PollingComponent(60000) { }

  uint8_t response_bytes[13];

  void update() override {
    const uint8_t command_byte = 0xCD;
    const uint8_t expected_response_byte = 0xCE;
    if (this->whr930_->execute_command(command_byte, 0, 0, expected_response_byte, response_bytes)) {
      this->speed = response_bytes[5];
      this->state = response_bytes[9] == 1;
      this->publish_state();
    }
  }

  fan::FanTraits get_traits() override {
    return fan::FanTraits(false, true, false, 55);
  }

 protected:
  Whr930 *whr930_;
  FanType *fan_type_;
  void control(const fan::FanCall &call) override {

  }
};

}
}