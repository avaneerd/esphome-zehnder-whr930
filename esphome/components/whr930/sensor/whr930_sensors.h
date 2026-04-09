#pragma once

#include "esphome/core/component.h"
#include "esphome/core/log.h"
#include "esphome/components/whr930/whr930.h"
#include "esphome/components/sensor/sensor.h"


namespace esphome {
namespace whr930 {

static constexpr const char *SENSOR_TAG = "whr930.sensor";

class Whr930Sensors : public PollingComponent {
 public:
  Whr930Sensors(Whr930 *whr930) :
    PollingComponent(62000),  // Staggered: sensor=62s
    whr930_(whr930) { }

  void set_t1_temperature_sensor(sensor::Sensor *temperature_sensor) { t1_temperature_sensor_ = temperature_sensor; }
  void set_t2_temperature_sensor(sensor::Sensor *temperature_sensor) { t2_temperature_sensor_ = temperature_sensor; }
  void set_t3_temperature_sensor(sensor::Sensor *temperature_sensor) { t3_temperature_sensor_ = temperature_sensor; }
  void set_t4_temperature_sensor(sensor::Sensor *temperature_sensor) { t4_temperature_sensor_ = temperature_sensor; }
  void set_bypass_position_sensor(sensor::Sensor *sensor) { bypass_position_sensor_ = sensor; }
  void set_supply_fan_speed_sensor(sensor::Sensor *sensor) { supply_fan_speed_sensor_ = sensor; }
  void set_exhaust_fan_speed_sensor(sensor::Sensor *sensor) { exhaust_fan_speed_sensor_ = sensor; }
  void set_supply_fan_rpm_sensor(sensor::Sensor *sensor) { supply_fan_rpm_sensor_ = sensor; }
  void set_exhaust_fan_rpm_sensor(sensor::Sensor *sensor) { exhaust_fan_rpm_sensor_ = sensor; }
  void set_filter_hours_sensor(sensor::Sensor *sensor) { filter_hours_sensor_ = sensor; }

  void dump_config() override {
    ESP_LOGCONFIG(SENSOR_TAG, "WHR930 Sensors:");
    ESP_LOGCONFIG(SENSOR_TAG, "  T1 Temperature: %s", this->t1_temperature_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  T2 Temperature: %s", this->t2_temperature_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  T3 Temperature: %s", this->t3_temperature_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  T4 Temperature: %s", this->t4_temperature_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  Bypass Position: %s", this->bypass_position_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  Supply Fan Speed: %s", this->supply_fan_speed_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  Exhaust Fan Speed: %s", this->exhaust_fan_speed_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  Supply Fan RPM: %s", this->supply_fan_rpm_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  Exhaust Fan RPM: %s", this->exhaust_fan_rpm_sensor_ ? "configured" : "disabled");
    ESP_LOGCONFIG(SENSOR_TAG, "  Filter Hours: %s", this->filter_hours_sensor_ ? "configured" : "disabled");
  }

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
    } else {
      ESP_LOGW(SENSOR_TAG, "Failed to read temperatures");
    }

    // Get bypass position from valve status command
    if (this->bypass_position_sensor_ != nullptr) {
      if (this->whr930_->execute_request(get_valve_command_, 0, 0, valve_response_, valve_response_bytes_)) {
        // Byte[0] = Bypass (%) (0xFF = undefined)
        if (valve_response_bytes_[0] != 0xFF) {
          this->bypass_position_sensor_->publish_state(valve_response_bytes_[0]);
        }
      } else {
        ESP_LOGW(SENSOR_TAG, "Failed to read bypass valve position");
      }
    }

    // Get fan status (speed % and RPM)
    if (this->supply_fan_speed_sensor_ != nullptr || this->exhaust_fan_speed_sensor_ != nullptr ||
        this->supply_fan_rpm_sensor_ != nullptr || this->exhaust_fan_rpm_sensor_ != nullptr) {
      if (this->whr930_->execute_request(get_fan_command_, 0, 0, fan_response_, fan_response_bytes_)) {
        // Byte[0] = supply fan speed (%)
        if (this->supply_fan_speed_sensor_ != nullptr) {
          this->supply_fan_speed_sensor_->publish_state(fan_response_bytes_[0]);
        }
        // Byte[1] = exhaust fan speed (%)
        if (this->exhaust_fan_speed_sensor_ != nullptr) {
          this->exhaust_fan_speed_sensor_->publish_state(fan_response_bytes_[1]);
        }
        // Byte[2-3] = supply fan RPM raw (high, low). RPM = 1875000 / raw_value
        if (this->supply_fan_rpm_sensor_ != nullptr) {
          uint16_t raw = (fan_response_bytes_[2] << 8) | fan_response_bytes_[3];
          if (raw > 0) {
            this->supply_fan_rpm_sensor_->publish_state(1875000.0f / raw);
          }
        }
        // Byte[4-5] = exhaust fan RPM raw (high, low). RPM = 1875000 / raw_value
        if (this->exhaust_fan_rpm_sensor_ != nullptr) {
          uint16_t raw = (fan_response_bytes_[4] << 8) | fan_response_bytes_[5];
          if (raw > 0) {
            this->exhaust_fan_rpm_sensor_->publish_state(1875000.0f / raw);
          }
        }
      } else {
        ESP_LOGW(SENSOR_TAG, "Failed to read fan status");
      }
    }

    // Get operating hours (filter hours)
    if (this->filter_hours_sensor_ != nullptr) {
      if (this->whr930_->execute_request(get_hours_command_, 0, 0, hours_response_, hours_response_bytes_)) {
        // Byte[14] = filter hours high byte, Byte[15] = filter hours low byte
        uint16_t filter_hours = (hours_response_bytes_[14] << 8) | hours_response_bytes_[15];
        this->filter_hours_sensor_->publish_state(filter_hours);
      } else {
        ESP_LOGW(SENSOR_TAG, "Failed to read operating hours");
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
  sensor::Sensor *supply_fan_speed_sensor_{nullptr};
  sensor::Sensor *exhaust_fan_speed_sensor_{nullptr};
  sensor::Sensor *supply_fan_rpm_sensor_{nullptr};
  sensor::Sensor *exhaust_fan_rpm_sensor_{nullptr};
  sensor::Sensor *filter_hours_sensor_{nullptr};

  const uint8_t get_command_byte_ = 0xD1;
  const uint8_t expected_response_byte_ = 0xD2;
  uint8_t response_bytes_[9];  // Temperature response: 9 data bytes

  const uint8_t get_valve_command_ = 0x0D;
  const uint8_t valve_response_ = 0x0E;
  uint8_t valve_response_bytes_[4];  // Valve status response: 4 data bytes

  const uint8_t get_fan_command_ = 0x0B;
  const uint8_t fan_response_ = 0x0C;
  uint8_t fan_response_bytes_[6];  // Fan status response: 6 data bytes

  const uint8_t get_hours_command_ = 0xDD;
  const uint8_t hours_response_ = 0xDE;
  uint8_t hours_response_bytes_[20];  // Operating hours response: 20 data bytes
};

}
}