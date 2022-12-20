#include "esphome.h"
#include "../../Whr930BaseComponent.h"

namespace esphome {
namespace whr930 {

class Whr930VentilationLevelComponent : Whr930BaseComponent {
 public:
  Whr930VentilationLevelComponent(UARTComponent *parent) : Whr930BaseComponent(parent) {}

  void set_ventilation_level_sensor(sensor::Sensor *sensor) { this->ventilation_level_sensor = sensor; }
  void set_supply_fan_active_text_sensor(text_sensor::TextSensor *sensor) { this->supply_fan_active_text_sensor = sensor; }

  void get_command_byte() override {
    return 0xCD;
  };

  void get_response_command_byte() override {
    return 0xCE;
  }

  virtual void process_data(uint8_t *data_bytes) {
    uint8_t ventilation_level = *(data_bytes + 8);
    this->ventilation_level_sensor.publish_state(ventilation_level);
    publish_state(ventilation_level);

    switch (*(data_bytes + 9))
    {
      case 1:
        this->supply_fan_active_text_sensor.publish_state("Active");
        break;
      case 0:
        this->supply_fan_active_text_sensor.publish_state("Inactive");
        break;
      default:
        this->supply_fan_active_text_sensor.publish_state("Unknown");
        break;
    }
  }

  protected:
    sensor::Sensor *ventilation_level_sensor;
    text_sensor::TextSensor *supply_fan_active_text_sensor;
};

}
}