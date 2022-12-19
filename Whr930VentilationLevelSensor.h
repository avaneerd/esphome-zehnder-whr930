#include "esphome.h"
#include "Whr930BaseComponent.h"

class Whr930VentilationLevelSensor : Whr930BaseComponent, Sensor {
 public:
  Whr930VentilationLevelSensor(UARTComponent *parent) : Whr930BaseComponent(parent) {}

  void get_command_byte() override {
    return 0xCD;
  };

  void get_response_command_byte() override {
    return 0xCE;
  }

  virtual void process_data(uint8_t *data_bytes) {
    uint8_t ventilation_level = *(data_bytes + 8);
    publish_state(ventilation_level);
  }
};