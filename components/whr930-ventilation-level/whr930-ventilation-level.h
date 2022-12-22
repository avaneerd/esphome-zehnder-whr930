#include "esphome.h"
#include "whr930.h"

namespace esphome {
namespace whr930 {

class Whr930VentilationLevel : public PollingComponent, public sensor {
 public:
  Whr930VentilationLevel() : PollingComponent(60000) {}

  void set_whr930(Whr930 *whr930) { this->whr930_ = whr930; }

  const uint8_t command_byte = 0xCD;
  const uint8_t expected_response_byte = 0xCE;

  void update() override {
    uint8_t response_bytes[13];
    if (this->whr930.execute_command(command_byte, 0, 0, expected_response_byte, response_bytes)) {
      uint8_t ventilation_level = response_bytes[8];
      this->publish_state(ventilation_level);
    }
  }

  protected:
    Whr930 *whr930_;
};

}
}