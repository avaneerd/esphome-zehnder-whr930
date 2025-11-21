# ESPHome Zehnder WHR930

An [ESPHome](https://esphome.io/) external component for integrating the Zehnder WHR930 ventilation system with Home Assistant.

## What it does

- Control supply fan, exhaust fan, or both
- Read temperature sensors (T1-T4)
- Monitor bypass valve position
- Check filter status
- Adjust comfort temperature

## Installation

Add to your ESPHome YAML configuration:

```yaml
external_components:
  - source: github://avaneerd/esphome-zehnder-whr930
    components: [ whr930 ]
```

## Configuration

```yaml
esphome:
  name: whr930

esp8266:
  board: d1_mini

uart:
  tx_pin: GPIO0
  rx_pin: GPIO1
  baud_rate: 9600

fan:
  - platform: whr930
    name: "Ventilation"
    type: "BOTH"  # SUPPLY, EXHAUST, or BOTH

sensor:
  - platform: whr930
    t1_temperature:
      name: "Outside Temperature"
    t2_temperature:
      name: "Supply Temperature"
    t3_temperature:
      name: "Return Temperature"
    t4_temperature:
      name: "Exhaust Temperature"
    bypass_position:
      name: "Bypass Position"

text_sensor:
  - platform: whr930
    filter_status:
      name: "Filter Status"

number:
  - platform: whr930
    comfort_temperature:
      name: "Comfort Temperature"
```

## Wiring

| WHR930 | ESP |
|--------|-----|
| TX | RX (GPIO1) |
| RX | TX (GPIO0) |
| GND | GND |

⚠️ Use a logic level converter between 5V WHR930 and 3.3V ESP.