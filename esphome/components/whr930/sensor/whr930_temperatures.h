#pragma once

#include "esphome/core/component.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/sensor/sensor.h"


namespace esphome {
namespace whr930 {

class Whr930Temperatures : public PollingComponent {
 public:
  Whr930Temperatures(Whr930 *whr930) :
    PollingComponent(60000),
    whr930_(whr930) { }

  void set_t1_temperature_sensor(sensor::Sensor *temperature_sensor) { t1_temperature_sensor_ = temperature_sensor; }
  void set_t2_temperature_sensor(sensor::Sensor *temperature_sensor) { t2_temperature_sensor_ = temperature_sensor; }
  void set_t3_temperature_sensor(sensor::Sensor *temperature_sensor) { t3_temperature_sensor_ = temperature_sensor; }
  void set_t4_temperature_sensor(sensor::Sensor *temperature_sensor) { t4_temperature_sensor_ = temperature_sensor; }
  void set_bypass_position_sensor(sensor::Sensor *sensor) { bypass_position_sensor_ = sensor; }

  void update() override {
    // Get temperatures
    if (this->whr930_->execute_request(get_command_byte_, 0, 0, expected_response_byte_, response_bytes_)) {
      if (this->t1_temperature_sensor_ != nullptr) {
        this->t1_temperature_sensor_->publish_state(response_bytes_[1] / 2. - 20);
      }

      if (this->t2_temperature_sensor_ != nullptr) {
        this->t2_temperature_sensor_->publish_state(response_bytes_[2] / 2. - 20);
      }

      if (this->t3_temperature_sensor_ != nullptr) {
        this->t3_temperature_sensor_->publish_state(response_bytes_[3] / 2. - 20);
      }

      if (this->t4_temperature_sensor_ != nullptr) {
        this->t4_temperature_sensor_->publish_state(response_bytes_[4] / 2. - 20);
      }
    }

    // Get bypass position from valve status command
    if (this->bypass_position_sensor_ != nullptr) {
      if (this->whr930_->execute_request(get_valve_command_, 0, 0, valve_response_, valve_response_bytes_)) {
        // Byte[0] = Bypass (%) (0xFF = undefined)
        if (valve_response_bytes_[0] != 0xFF) {
          this->bypass_position_sensor_->publish_state(valve_response_bytes_[0]);
        }
      }
    }
  }

 protected:
  Whr930 *whr930_;
  sensor::Sensor *t1_temperature_sensor_{nullptr};
  sensor::Sensor *t2_temperature_sensor_{nullptr};
  sensor::Sensor *t3_temperature_sensor_{nullptr};
  sensor::Sensor *t4_temperature_sensor_{nullptr};
  sensor::Sensor *bypass_position_sensor_{nullptr};

  const uint8_t get_command_byte_ = 0xD1;
  const uint8_t expected_response_byte_ = 0xD2;
  uint8_t response_bytes_[13];  // Temperature response: 9 data bytes + metadata

  const uint8_t get_valve_command_ = 0x0D;
  const uint8_t valve_response_ = 0x0E;
  uint8_t valve_response_bytes_[4];  // Valve status response: 4 data bytes
};

}
}