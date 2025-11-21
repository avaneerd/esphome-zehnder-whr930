# ESPHome Zehnder WHR930 Integration

[![GitHub](https://img.shields.io/github/license/avaneerd/esphome-zehnder-whr930)](LICENSE)

An [ESPHome](https://esphome.io/) external component for integrating the **Zehnder WHR930 ventilation system** with Home Assistant. This component enables control and monitoring of your WHR930 unit via ESP8266 or ESP32 microcontrollers.

## Features

- 🌀 **Fan Control**: Control supply fan, exhaust fan, or both simultaneously
- 🌡️ **Temperature Monitoring**: Read all four temperature sensors (T1-T4)
- ⚙️ **Comfort Temperature**: Adjust comfort temperature settings
- 🏠 **Home Assistant Integration**: Seamless integration via ESPHome
- 📡 **UART Communication**: Direct communication with WHR930 via serial interface

## Supported Sensors

| Sensor | Description |
|--------|-------------|
| **T1** | Outside to WHR930 temperature (incoming fresh air) |
| **T2** | WHR930 to inside temperature (supply air) |
| **T3** | Inside to WHR930 temperature (return air) |
| **T4** | WHR930 to outside temperature (exhaust air) |

## Hardware Requirements

- **ESP8266** (e.g., D1 Mini, NodeMCU) or **ESP32** board
- Connection to WHR930 UART interface
- Appropriate voltage level shifter if needed (WHR930 uses 5V TTL, ESP uses 3.3V)

### Wiring

Connect your ESP to the WHR930's service connector:

| WHR930 Pin | ESP Pin | Description |
|------------|---------|-------------|
| TX | RX (e.g., GPIO1) | WHR930 transmit to ESP receive |
| RX | TX (e.g., GPIO0) | ESP transmit to WHR930 receive |
| GND | GND | Common ground |

⚠️ **Note**: Use a logic level converter if connecting 3.3V ESP directly to 5V WHR930 serial pins.

## Installation

### Using ESPHome Dashboard

1. Add this repository as an external component in your ESPHome YAML configuration:

```yaml
external_components:
  - source: github://avaneerd/esphome-zehnder-whr930
    components: [ whr930 ]
```

### Manual Installation

Clone this repository into your ESPHome `custom_components` directory or reference it via Git.

## Configuration

### Basic Example

```yaml
esphome:
  name: whr930-controller

esp8266:
  board: d1_mini

# Configure UART
uart:
  id: uart_bus
  tx_pin: GPIO0
  rx_pin: GPIO1
  baud_rate: 9600

# Fan controls
fan:
  - platform: whr930
    name: "Supply Fan"
    type: "SUPPLY"
  
  - platform: whr930
    name: "Exhaust Fan"
    type: "EXHAUST"
  
  - platform: whr930
    name: "Ventilation"
    type: "BOTH"

# Temperature sensors
sensor:
  - platform: whr930
    t1_temperature:
      name: "Fresh Air Temperature"
    t2_temperature:
      name: "Supply Air Temperature"
    t3_temperature:
      name: "Return Air Temperature"
    t4_temperature:
      name: "Exhaust Air Temperature"

# Comfort temperature setting
number:
  - platform: whr930
    comfort_temperature:
      name: "Comfort Temperature"
```

### Configuration Options

#### Fan Platform

The `whr930` fan platform supports three types:

- **`SUPPLY`**: Controls only the supply air fan
- **`EXHAUST`**: Controls only the exhaust air fan  
- **`BOTH`**: Controls both fans together (typical usage)

```yaml
fan:
  - platform: whr930
    name: "Ventilation"
    type: "BOTH"  # SUPPLY, EXHAUST, or BOTH
```

#### Sensor Platform

All temperature sensors are optional - include only the ones you need:

```yaml
sensor:
  - platform: whr930
    t1_temperature:
      name: "Outside Temperature"
      # All standard ESPHome sensor options available
      filters:
        - offset: 0.0
    t2_temperature:
      name: "Supply Temperature"
    t3_temperature:
      name: "Return Temperature"
    t4_temperature:
      name: "Exhaust Temperature"
```

#### Number Platform

Adjust the comfort temperature setting:

```yaml
number:
  - platform: whr930
    comfort_temperature:
      name: "Comfort Temperature"
      # Standard ESPHome number options available
```

## How It Works

This component communicates with the WHR930 using its proprietary UART protocol:

- **Baud Rate**: 9600
- **Protocol**: Custom Zehnder protocol with checksums
- **Communication**: Request/response pattern with acknowledgments

The component implements the WHR930's command structure including:
- Command framing with start/end bytes
- Checksum validation
- Acknowledgment handling
- Response parsing

## Troubleshooting

### No Communication with WHR930

1. **Check wiring**: Ensure TX connects to RX and vice versa
2. **Verify voltage levels**: Use a logic level converter if needed
3. **Check baud rate**: Must be 9600
4. **Enable logging**: Set ESPHome log level to `DEBUG` or `VERBOSE`

```yaml
logger:
  level: DEBUG
```

### Incorrect Temperature Readings

- Verify sensor IDs in your configuration match the physical connections
- Check for loose connections
- Monitor ESPHome logs for communication errors

### Fan Control Not Working

- Ensure `type` is set correctly (`SUPPLY`, `EXHAUST`, or `BOTH`)
- Verify UART communication is working (check temperature sensors first)
- Check that WHR930 is in a mode that accepts fan speed commands

## Development

This project follows ESPHome's external component structure. See the [contributing guidelines](.github/copilot-instructions.md) for development information.

### Project Structure

```
esphome/components/whr930/
├── __init__.py              # Component registration
├── whr930.h                 # UART communication header
├── whr930.cpp               # Protocol implementation
├── fan/                     # Fan platform
├── sensor/                  # Sensor platform
└── number/                  # Number platform
```

## Compatibility

- **ESPHome**: 2023.x and later
- **Home Assistant**: Any version supporting ESPHome
- **Hardware**: Zehnder WHR930 ventilation unit

## License

This project is provided as-is for personal and commercial use. See [LICENSE](LICENSE) file for details.

## Acknowledgments

- Protocol reverse-engineered from WHR930 UART communication
- Built with [ESPHome](https://esphome.io/) framework

## Support

For issues, questions, or contributions:
- [Open an issue](https://github.com/avaneerd/esphome-zehnder-whr930/issues)
- [Submit a pull request](https://github.com/avaneerd/esphome-zehnder-whr930/pulls)

## Disclaimer

⚠️ This component controls ventilation equipment. While tested, use at your own risk. Improper ventilation can affect indoor air quality and health. Always ensure your ventilation system operates safely and as intended.