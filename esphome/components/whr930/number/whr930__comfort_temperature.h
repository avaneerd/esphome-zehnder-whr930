#pragma once

#include "esphome/core/component.h"
#include "esphome/core/log.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/number/number.h"


namespace esphome {
namespace whr930 {

static constexpr const char *NUMBER_TAG = "whr930.number";

class Whr930ComfortTemperature : public PollingComponent, public number::Number {
 public:
  Whr930ComfortTemperature(Whr930 *whr930) :
    PollingComponent(66000),  // Staggered: number=66s
    whr930_(whr930) { }

  void dump_config() override {
    ESP_LOGCONFIG(NUMBER_TAG, "WHR930 Comfort Temperature:");
    ESP_LOGCONFIG(NUMBER_TAG, "  Range: %d - %d C", min_temperature, max_temperature);
  }

  const uint8_t get_command_byte = 0xD1;
  const uint8_t expected_response_byte = 0xD2;
  const uint8_t min_temperature = 15;
  const uint8_t max_temperature = 25;
  uint8_t response_bytes[9];  // Temperature response: 9 data bytes
  uint8_t data_bytes[8] = {};

  void update() override {
    if (this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      this->state = response_bytes[0] / 2.0 - 20;
      this->publish_state(this->state);
    } else {
      ESP_LOGW(NUMBER_TAG, "Failed to read comfort temperature");
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
      ESP_LOGW(NUMBER_TAG, "Failed to set comfort temperature to %.0f", temperature);
      return;
    }

    this->publish_state(this->state);
  }
};

}
}