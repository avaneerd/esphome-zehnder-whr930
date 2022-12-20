#include "esphome.h"
#include "whr930.h"

namespace esphome {
namespace whr930 {

class Whr930VentilationLevelComponent : public PollingComponent {
 public:
  Whr930VentilationLevelComponent(Whr930 *whr930) : PollingComponent(60000) {
    this->whr930_ = whr930_;
  }

  void set_ventilation_level_sensor(sensor::Sensor *sensor) { this->ventilation_level_sensor_ = sensor; }
  void set_supply_fan_active_text_sensor(text_sensor::TextSensor *sensor) { this->supply_fan_active_text_sensor_ = sensor; }

  const uint8_t command_byte = 0xCD;
  const uint8_t expected_response_byte = 0xCE;

  void update() override {
    uint8_t response_bytes[13];
    if (this->whr930.execute_command(command_byte, 0, 0, expected_response_byte, response_bytes)) {
      uint8_t ventilation_level = *(data_bytes + 8);
      this->ventilation_level_sensor_.publish_state(ventilation_level);

      switch (*(data_bytes + 9))
      {
        case 1:
          this->supply_fan_active_text_sensor_.publish_state("Active");
          break;
        case 0:
          this->supply_fan_active_text_sensor_.publish_state("Inactive");
          break;
        default:
          this->supply_fan_active_text_sensor_.publish_state("Unknown");
          break;
      }
    }
  }

  protected:
    sensor::Sensor *ventilation_level_sensor_;
    text_sensor::TextSensor *supply_fan_active_text_sensor_;
    Whr930 *whr930_;
};

}
}