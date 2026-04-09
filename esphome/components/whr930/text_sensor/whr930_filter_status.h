#pragma once

#include "esphome/core/component.h"
#include "esphome/core/log.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/text_sensor/text_sensor.h"

#include <cstdio>

namespace esphome {
namespace whr930 {

static constexpr const char *FILTER_TAG = "whr930.filter";

class Whr930FilterStatus : public PollingComponent {
 public:
  Whr930FilterStatus(Whr930 *whr930) :
    PollingComponent(64000),  // Staggered: text_sensor=64s
    whr930_(whr930) { }

  void set_filter_status_sensor(text_sensor::TextSensor *sensor) { filter_status_sensor_ = sensor; }
  void set_error_a_sensor(text_sensor::TextSensor *sensor) { error_a_sensor_ = sensor; }
  void set_error_e_sensor(text_sensor::TextSensor *sensor) { error_e_sensor_ = sensor; }
  void set_error_ea_sensor(text_sensor::TextSensor *sensor) { error_ea_sensor_ = sensor; }

  void dump_config() override {
    ESP_LOGCONFIG(FILTER_TAG, "WHR930 Filter/Faults:");
    ESP_LOGCONFIG(FILTER_TAG, "  Filter Status: %s", this->filter_status_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(FILTER_TAG, "  Error A: %s", this->error_a_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(FILTER_TAG, "  Error E: %s", this->error_e_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(FILTER_TAG, "  Error EA: %s", this->error_ea_sensor_ ? "configured" : "disabled");
  }

  void update() override {
    if (this->whr930_->execute_request(get_faults_command_, 0, 0, faults_response_, faults_response_bytes_)) {
      // Byte[8] = 0x00 = Filter OK, 0x01 = Filter full
      if (this->filter_status_sensor_ != nullptr) {
        if (faults_response_bytes_[8] == 0x00) {
          this->filter_status_sensor_->publish_state("Ok");
        } else if (faults_response_bytes_[8] == 0x01) {
          this->filter_status_sensor_->publish_state("Full");
        } else {
          this->filter_status_sensor_->publish_state("Unknown");
        }
      }

      // Byte[0] = Current error A (0 = no error)
      if (this->error_a_sensor_ != nullptr) {
        this->error_a_sensor_->publish_state(format_error_code_("A", faults_response_bytes_[0]));
      }

      // Byte[1] = Current error E (0 = no error)
      if (this->error_e_sensor_ != nullptr) {
        this->error_e_sensor_->publish_state(format_error_code_("E", faults_response_bytes_[1]));
      }

      // Byte[9] = Current error EA (0 = no error)
      if (this->error_ea_sensor_ != nullptr) {
        this->error_ea_sensor_->publish_state(format_error_code_("EA", faults_response_bytes_[9]));
      }
    } else {
      ESP_LOGW(FILTER_TAG, "Failed to read faults/filter status");
    }
  }

 protected:
  Whr930 *whr930_;
  text_sensor::TextSensor *filter_status_sensor_{nullptr};
  text_sensor::TextSensor *error_a_sensor_{nullptr};
  text_sensor::TextSensor *error_e_sensor_{nullptr};
  text_sensor::TextSensor *error_ea_sensor_{nullptr};

  const uint8_t get_faults_command_ = 0xD9;
  const uint8_t faults_response_ = 0xDA;
  uint8_t faults_response_bytes_[17];  // Faults response: 17 data bytes (errors + filter status)

  std::string format_error_code_(const char *prefix, uint8_t code) {
    if (code == 0) {
      return "None";
    }
    char buf[16];
    snprintf(buf, sizeof(buf), "%s%d", prefix, code);
    return std::string(buf);
  }
};

}
}
