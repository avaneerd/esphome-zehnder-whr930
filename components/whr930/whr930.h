#include "esphome.h"

namespace esphome {
namespace whr930 {

class Whr930 : public Component, public UARTDevice {
 public:
  Whr930BaseComponent(UARTComponent *parent) : UARTDevice(parent) {}

  bool execute_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size,
    uint8_t expected_response_byte,
    uint8_t *response_data_bytes);
};

}
}