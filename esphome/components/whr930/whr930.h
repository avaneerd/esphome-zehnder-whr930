#pragma once

#include "esphome/core/component.h"
#include "esphome/components/uart/uart.h"

namespace esphome {
namespace whr930 {

class Whr930 : public uart::UARTDevice, public Component {
 public:
    void setup() override;
    void on_shutdown() override;
    float get_setup_priority() const override { return setup_priority::LATE; }

    bool execute_request(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size,
    uint8_t expected_response_byte,
    uint8_t *response_data_bytes);

    bool execute_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size);

 protected:
  void send_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size);
  uint8_t calculate_checksum(uint8_t *bytes, size_t len);
  bool received_ack();
  bool process_response(uint8_t expected_response_byte, uint8_t *response_data_bytes);
  bool is_expected_byte(uint8_t expected_byte);
  void clear_buffers();

  uint8_t command_buffer_[20];
};

}
}
