#include <algorithm>
#include "Whr930BaseComponent.h"

namespace esphome {
namespace whr930 {

void Whr930BaseComponent::update()
{
    this->send_command();
    this.wait_for_ack();
    this->received_expected_response();
    this->process_response();
}

void Whr930BaseComponent::send_command()
{
    uint8_t data_length = this->get_data_size();
    uint8_t command_size = data_length + 8;
    uint8_t command[command_size];

    // start bytes
    command[0] = 0x07;
    command[1] = 0xF0;

    // command bytes
    command[2] = 0x00;
    command[3] = this->get_command_byte();

    // data
    command[4] = (uint8_t)command_buffer.length - 2;
    this->get_data_bytes(&command[5]);

    // checksum
    command[5 + data_length] = this->calculate_checksum(&command[2], 3 + data_length);

    // end bytes
    command[6 + data_length] = 0x07;
    command[7 + data_length] = 0x0F;

    this->flush();
    this->write_array(command, command_size);
}

uint8_t Whr930BaseComponent::calculate_checksum(uint8_t *bytes, , size_t len)
{
    uint8_t checksum = 0xAD;
    uint8_t index = 0;
    bool stop_byte_already_processed = false;

    do {
        uint8_t value = *(bytes + index);

        if (value == 0x07) {
            if (stop_byte_already_processed) {
                continue;
            }

            stop_byte_already_processed = true;
        }

        checksum += value;

    } while (++index < len)

    return checksum & 0xFF;
}

bool Whr930BaseComponent::received_ack()
{
    return this->is_expected_byte(0x07) && this->is_expected_byte(0xF3);
}

void Whr930BaseComponent::process_response() {
    // check for start bytes
    if (!this->is_expected_byte(0x07) || !this->is_expected_byte(0xF0)) {
        return;
    }

    // check for command
    uint8_t response[20];
    response[0] = 0x00;
    response[1] = this->get_response_command_byte();
    if (!this->is_expected_byte(response[0]) || !this->is_expected_byte(response[1])) {
        return;
    }

    // read data size
    if (!this->read_byte(&response[2])) {
        return;
    }
    uint8_t data_size = response[2];

    // read data
    if (data_size > 0 && !this->read_bytes(&response[3], data_size)) {
        return;
    }

    // validate checksum
    uint8_t checksum = calculate_checksum(response, 3 + data_size);
    if (!this->is_expected_byte(checksum)) {
        return;
    }

    // check for end bytes
    if (!this->is_expected_byte(0x07) || !this->is_expected_byte(0x0F)) {
        return;
    }

    this->process_data(&response[3]);
}

bool Whr930BaseComponent::is_expected_byte(uint8_t expected_byte)
{
    uint32_t wait_count = 0;
    uint32_t max_wait_count = 1000;
    while (this->available() < 1 && ++wait_count < max_wait_count) {}

    if (this->available() < 1) {
        return false;
    }

    uint8_t received_byte;
    if (!this->peek_byte(received_byte) || received_byte != expected_byte) {
        return false;
    }

    return this->read_byte(received_byte);
}

}
}