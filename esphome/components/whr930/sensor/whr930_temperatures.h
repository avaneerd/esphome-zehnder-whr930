#pragma once

#include "esphome/core/component.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/sensor/sensor.h"


namespace esphome {
namespace whr930 {

class Whr930Temperatures : public PollingComponent {
 public:
  Whr930Temperatures(Whr930 *whr930) :
    whr930_(whr930),
    PollingComponent(60000) { }

  void set_t1_temperature_sensor(sensor::Sensor *temperature_sensor) { t1_temperature_sensor_ = temperature_sensor; }
  void set_t2_temperature_sensor(sensor::Sensor *temperature_sensor) { t2_temperature_sensor_ = temperature_sensor; }
  void set_t3_temperature_sensor(sensor::Sensor *temperature_sensor) { t3_temperature_sensor_ = temperature_sensor; }
  void set_t4_temperature_sensor(sensor::Sensor *temperature_sensor) { t4_temperature_sensor_ = temperature_sensor; }

  const uint8_t get_command_byte = 0xD1;
  const uint8_t expected_response_byte = 0xD2;
  uint8_t response_bytes[13];

  void update() override {
    if (this->whr930_->execute_request(get_command_byte, 0, 0, expected_response_byte, response_bytes)) {
      if (this->t1_temperature_sensor_ != nullptr)
        this->t1_temperature_sensor_->publish_state(response_bytes[1] / 2 - 20);

      if (this->t2_temperature_sensor_ != nullptr)
        this->t2_temperature_sensor_->publish_state(response_bytes[2] / 2 - 20);

      if (this->t3_temperature_sensor_ != nullptr)
        this->t3_temperature_sensor_->publish_state(response_bytes[3] / 2 - 20);

      if (this->t4_temperature_sensor_ != nullptr)
        this->t4_temperature_sensor_->publish_state(response_bytes[4] / 2 - 20);
    }
  }

 protected:
  Whr930 *whr930_;
  sensor::Sensor *t1_temperature_sensor_;
  sensor::Sensor *t2_temperature_sensor_;
  sensor::Sensor *t3_temperature_sensor_;
  sensor::Sensor *t4_temperature_sensor_;
};

}
}