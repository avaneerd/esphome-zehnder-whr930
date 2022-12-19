#include "esphome.h"

class Whr930BaseComponent : public PollingComponent, public UARTDevice {
 public:
  Whr930BaseComponent(UARTComponent *parent) : PollingComponent(60000), UARTDevice(parent) {}

  virtual uint8_t get_data_size() = 0;
  virtual uint8_t get_command_byte() = 0;
  virtual uint8_t get_response_command_byte() = 0;
  virtual void get_data_bytes(uint8_t *command_bytes) = 0;
  virtual void process_data(uint8_t *data_bytes) = 0;

  void update() override;

 private:
  void send_command();
};