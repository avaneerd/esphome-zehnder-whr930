#pragma once

#include "esphome/core/component.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/number/number.h"


namespace esphome {
namespace whr930 {

class Whr930ComfortTemperature : public PollingComponent, public number::Number {
 public:
  Whr930ComfortTemperature(Whr930 *whr930) :
    whr930_(whr930),
    PollingComponent(60000) { }

  const uint8_t get_command_byte = 0xD1;
  const uint8_t expected_response_byte = 0xD2;
  const uint8_t min_temperature = 15;
  const uint8_t max_temperature = 25;
  uint8_t response_bytes[13];
  uint8_t data_bytes[8] = {};

  void update() override {
    if (this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      this->state = response_bytes[0] / 2 - 20;
      this->publish_state(this->state);
    }
  }

 protected:
  Whr930 *whr930_;
  void control(const float temperature) override {
    const uint8_t command_byte = 0xD3;

    if (temperature < min_temperature || temperature > max_temperature) {
      return;
    }

    if (this->state == temperature) {
      return;
    }

    this->state = temperature;

    data_bytes[0] = (temperature + 20) * 2;
    if (!this->whr930_->execute_command(command_byte, data_bytes, 1)) {
      return;
    }

    this->publish_state(this->state);
  }
};

}
}