#pragma once

#include "esphome.h"
#include "esphome/core/component.h"
#include "esphome/components/sensor/sensor.h"
#include "esphome/components/text_sensor/text_sensor.h"
#include "esphome/components/uart/uart.h"

namespace esphome {
namespace whr930 {

class Whr930 : public uart::UARTDevice, public PollingComponent {
 public:
  Whr930(uart::UARTComponent *uart) : uart::UARTDevice(uart), PollingComponent(60000) { }

  void set_ventilation_level(sensor::Sensor *sensor) { this->ventilation_level_ = sensor; }
  void set_supply_fan_active(text_sensor::TextSensor *sensor) { this->supply_fan_active_ = sensor; }

  uint8_t response_bytes[13];

  void update() override {
    this->get_ventilation_level();
  }

  void get_ventilation_level() {
    const uint8_t command_byte = 0xCD;
    const uint8_t expected_response_byte = 0xCE;
    if (this->execute_command(command_byte, 0, 0, expected_response_byte, response_bytes)) {
      uint8_t ventilation_level = response_bytes[8];
      this->ventilation_level_->publish_state(ventilation_level);

      switch (response_bytes[9])
      {
        case 1:
          this->supply_fan_active_->publish_state("Active");
          break;
        case 0:
          this->supply_fan_active_->publish_state("Inactive");
          break;
        default:
          this->supply_fan_active_->publish_state("Unknown");
          break;
      }
    }
  }

 protected:
  sensor::Sensor *ventilation_level_{nullptr};
  text_sensor::TextSensor *supply_fan_active_{nullptr};
  bool execute_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size,
    uint8_t expected_response_byte,
    uint8_t *response_data_bytes);
  void send_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size);
  uint8_t calculate_checksum(uint8_t *bytes, size_t len);
  bool received_ack();
  bool process_response(uint8_t expected_response_byte, uint8_t *response_data_bytes);
  bool is_expected_byte(uint8_t expected_byte);
};

}
}