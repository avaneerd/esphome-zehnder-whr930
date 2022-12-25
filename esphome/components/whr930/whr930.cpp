#include "whr930.h"

namespace esphome {
namespace whr930 {

bool Whr930::execute_request(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size,
    uint8_t expected_response_byte,
    uint8_t *response_data_bytes)
{
    this->send_command(command_byte, data_bytes, data_size);
    return this->received_ack() && this->process_response(expected_response_byte, response_data_bytes);
}

bool Whr930::execute_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size)
{
    this->send_command(command_byte, data_bytes, data_size);
    return this->received_ack();
}

uint8_t command[20];
void Whr930::send_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size)
{
    uint8_t command_size = data_size + 8;

    // start bytes
    command[0] = 0x07;
    command[1] = 0xF0;

    // command bytes
    command[2] = 0x00;
    command[3] = command_byte;

    // data
    command[4] = (uint8_t)data_size;

    for (int i = 0; i < data_size; i++) {
        command[5 + i] = *(data_bytes + i);
    }

    // checksum
    command[5 + data_size] = this->calculate_checksum(&command[2], 3 + data_size);

    // end bytes
    command[6 + data_size] = 0x07;
    command[7 + data_size] = 0x0F;

    this->clear_buffers();
    this->write_array(command, command_size);
    this->flush();
}

uint8_t Whr930::calculate_checksum(uint8_t *bytes, size_t len)
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

    } while (++index < len);

    return checksum & 0xFF;
}

bool Whr930::received_ack()
{
    return this->is_expected_byte(0x07) && this->is_expected_byte(0xF3);
}

bool Whr930::process_response(
    uint8_t expected_response_byte,
    uint8_t *response_data_bytes) {
    // check for start bytes
    if (!this->is_expected_byte(0x07) || !this->is_expected_byte(0xF0)) {
        return false;
    }

    // check for command
    uint8_t response[20];
    response[0] = 0x00;
    response[1] = expected_response_byte;
    if (!this->is_expected_byte(response[0]) || !this->is_expected_byte(response[1])) {
        return false;
    }

    // read data size
    if (!this->read_byte(&response[2])) {
        return false;
    }
    uint8_t data_size = response[2];

    // read data
    if (data_size > 0 && !this->read_array(&response[3], data_size)) {
        return false;
    }

    // validate checksum
    uint8_t checksum = calculate_checksum(response, 3 + data_size);
    if (!this->is_expected_byte(checksum)) {
        return false;
    }

    // check for end bytes
    if (!this->is_expected_byte(0x07) || !this->is_expected_byte(0x0F)) {
        return false;
    }

    for (int i = 0; i < data_size; i++) {
        *(response_data_bytes + i) = response[3 + i];
    }

    return true;
}

bool Whr930::is_expected_byte(uint8_t expected_byte)
{
    uint32_t wait_count = 0;
    uint32_t max_wait_count = 1000;
    while (this->available() < 1 && ++wait_count < max_wait_count) {}

    if (this->available() < 1) {
        return false;
    }

    uint8_t received_byte;
    if (!this->peek_byte(&received_byte) || received_byte != expected_byte) {
        return false;
    }

    return this->read_byte(&received_byte);
}

void Whr930::clear_buffers()
{
    this->flush();

    int available = this->available();
    if (available > 0) {
        uint8_t discard_buffer[available] = {};
        this->read_array(discard_buffer, available);
    }
}

}
}