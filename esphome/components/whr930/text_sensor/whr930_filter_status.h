#pragma once

#include "esphome/core/component.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/text_sensor/text_sensor.h"


namespace esphome {
namespace whr930 {

class Whr930FilterStatus : public PollingComponent {
 public:
  Whr930FilterStatus(Whr930 *whr930) :
    whr930_(whr930),
    PollingComponent(60000) { }

  void set_filter_status_sensor(text_sensor::TextSensor *sensor) { filter_status_sensor_ = sensor; }

  const uint8_t get_faults_command = 0xD9;
  const uint8_t faults_response = 0xDA;
  uint8_t faults_response_bytes[17];

  void update() override {
    if (this->filter_status_sensor_ != nullptr) {
      if (this->whr930_->execute_request(get_faults_command, 0, 0, faults_response, faults_response_bytes)) {
        // Byte[8] = 0x00 = Filter OK, 0x01 = Filter full
        if (faults_response_bytes[8] == 0x00) {
          this->filter_status_sensor_->publish_state("Ok");
        } else if (faults_response_bytes[8] == 0x01) {
          this->filter_status_sensor_->publish_state("Full");
        } else {
          this->filter_status_sensor_->publish_state("Unknown");
        }
      }
    }
  }

 protected:
  Whr930 *whr930_;
  text_sensor::TextSensor *filter_status_sensor_{nullptr};
};

}
}
