#include "whr930.h"
#include "esphome/core/log.h"
#include <algorithm>

namespace esphome {
namespace whr930 {

static const char *TAG = "whr930";

void Whr930::setup() {
    // Set RS232 mode to "PC Master" (0x03) to claim the bus
    // This prevents collisions with the CC-Ease panel on the shared RS232 bus
    uint8_t mode = 0x03;  // PC Master
    if (this->execute_command(0x9B, &mode, 1)) {
        ESP_LOGI(TAG, "RS232 mode set to PC Master (0x03)");
    } else {
        ESP_LOGE(TAG, "Failed to set RS232 mode - bus collisions may occur");
    }
}

void Whr930::on_shutdown() {
    // Release RS232 bus by setting mode to "End" (0x00)
    uint8_t mode = 0x00;  // End / release
    if (this->execute_command(0x9B, &mode, 1)) {
        ESP_LOGI(TAG, "RS232 mode released (0x00)");
    } else {
        ESP_LOGW(TAG, "Failed to release RS232 mode");
    }
}

void Whr930::dump_config() {
    ESP_LOGCONFIG(TAG, "Zehnder WHR930:");
    ESP_LOGCONFIG(TAG, "  RS232 mode: PC Master (0x03)");
}

bool Whr930::execute_request(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size,
    uint8_t expected_response_byte,
    uint8_t *response_data_bytes)
{
    this->send_command(command_byte, data_bytes, data_size);
    if (!this->received_ack()) {
        ESP_LOGW(TAG, "No ACK received for request command 0x%02X", command_byte);
        this->clear_buffers();
        return false;
    }
    if (!this->process_response(expected_response_byte, response_data_bytes)) {
        ESP_LOGW(TAG, "Failed to process response for command 0x%02X", command_byte);
        this->clear_buffers();
        return false;
    }
    // Send ACK back to the WHR930 to confirm we received the response
    this->send_ack_();
    ESP_LOGD(TAG, "Request command 0x%02X completed successfully", command_byte);
    return true;
}

bool Whr930::execute_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size)
{
    this->send_command(command_byte, data_bytes, data_size);
    if (!this->received_ack()) {
        ESP_LOGW(TAG, "No ACK received for write command 0x%02X", command_byte);
        this->clear_buffers();
        return false;
    }
    ESP_LOGD(TAG, "Write command 0x%02X completed successfully", command_byte);
    return true;
}

void Whr930::send_command(
    uint8_t command_byte,
    uint8_t *data_bytes,
    size_t data_size)
{
    if (data_size > sizeof(command_buffer_) - 8) {
        ESP_LOGE(TAG, "Command data_size %u exceeds buffer capacity (%u max)",
                 data_size, sizeof(command_buffer_) - 8);
        return;
    }

    uint8_t command_size = data_size + 8;

    // start bytes
    this->command_buffer_[0] = 0x07;
    this->command_buffer_[1] = 0xF0;

    // command bytes
    this->command_buffer_[2] = 0x00;
    this->command_buffer_[3] = command_byte;

    // data
    this->command_buffer_[4] = (uint8_t)data_size;

    for (int i = 0; i < data_size; i++) {
        this->command_buffer_[5 + i] = *(data_bytes + i);
    }

    // checksum
    this->command_buffer_[5 + data_size] = this->calculate_checksum(&this->command_buffer_[2], 3 + data_size);

    // end bytes
    this->command_buffer_[6 + data_size] = 0x07;
    this->command_buffer_[7 + data_size] = 0x0F;

    this->clear_buffers();
    this->write_array(this->command_buffer_, command_size);
    this->flush();
    ESP_LOGD(TAG, "Sent command 0x%02X with %u data bytes", command_byte, data_size);
}

uint8_t Whr930::calculate_checksum(uint8_t *bytes, size_t len)
{
    uint8_t checksum = 0xAD;
    size_t index = 0;
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

void Whr930::send_ack_()
{
    uint8_t ack[] = {0x07, 0xF3};
    this->write_array(ack, sizeof(ack));
    this->flush();
}

bool Whr930::process_response(
    uint8_t expected_response_byte,
    uint8_t *response_data_bytes) {
    // check for start bytes
    if (!this->is_expected_byte(0x07) || !this->is_expected_byte(0xF0)) {
        return false;
    }

    // check for command
    uint8_t response[24];  // 3 header bytes + up to 20 data bytes + 1 checksum
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
    if (data_size > 20) {
        ESP_LOGE(TAG, "Response data_size %u exceeds buffer capacity", data_size);
        return false;
    }

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
    uint32_t start = millis();
    uint32_t timeout_ms = 150;
    while (this->available() < 1) {
        if (millis() - start >= timeout_ms) {
            ESP_LOGW(TAG, "Timeout waiting for byte 0x%02X", expected_byte);
            return false;
        }
        yield();
    }

    uint8_t received_byte;
    if (!this->peek_byte(&received_byte) || received_byte != expected_byte) {
        this->read_byte(&received_byte);
        ESP_LOGW(TAG, "Expected 0x%02X, got 0x%02X", expected_byte, received_byte);
        return false;
    }

    return this->read_byte(&received_byte);
}

void Whr930::clear_buffers()
{
    this->flush();

    int avail = this->available();
    if (avail > 0) {
        ESP_LOGD(TAG, "Clearing %d stale bytes from RX buffer", avail);
        uint8_t buf[64];
        while (avail > 0) {
            size_t to_read = std::min(static_cast<size_t>(avail), sizeof(buf));
            if (!this->read_array(buf, to_read)) {
                break;
            }
            avail -= to_read;
        }
    }
}

}
}