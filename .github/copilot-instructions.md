# GitHub Copilot Instructions for esphome-zehnder-whr930

## Project Overview

This repository provides an **ESPHome external component** for integrating the **Zehnder WHR930 ventilation system** with ESPHome. It enables ESP8266/ESP32 devices to communicate with the WHR930 unit via UART, exposing fan controls, temperature sensors, and comfort temperature settings.

### Purpose
- Control and monitor Zehnder WHR930 ventilation units
- Integrate WHR930 with Home Assistant via ESPHome
- Provide fan speed control for supply, exhaust, or both fans
- Read temperature sensors (T1-T4)
- Adjust comfort temperature settings

## Project Structure

```
esphome-zehnder-whr930/
├── esphome/
│   └── components/
│       └── whr930/              # Main component directory
│           ├── __init__.py      # Component registration and setup
│           ├── whr930.h         # C++ header for UART communication
│           ├── whr930.cpp       # C++ implementation of WHR930 protocol
│           ├── fan/             # Fan platform integration
│           │   ├── __init__.py  # Fan component configuration
│           │   └── whr930_fan.h # Fan platform C++ header
│           ├── sensor/          # Temperature sensor platform
│           │   ├── __init__.py  # Sensor component configuration
│           │   └── whr930_temperatures.h
│           └── number/          # Number platform for comfort temp
│               ├── __init__.py  # Number component configuration
│               └── whr930__comfort_temperature.h
├── test_components.yaml         # Example ESPHome configuration
├── README.md
└── .gitignore
```

### Key Components

1. **Core Component (`whr930/`)**: Handles UART communication with the WHR930 unit using a custom protocol
   - Implements request/response pattern with checksums
   - Manages command execution and acknowledgments
   
2. **Fan Platform (`whr930/fan/`)**: Exposes fan controls with three modes:
   - `SUPPLY`: Controls supply air fan only
   - `EXHAUST`: Controls exhaust air fan only
   - `BOTH`: Controls both fans together

3. **Sensor Platform (`whr930/sensor/`)**: Provides temperature readings:
   - T1: Outside to WHR930 temperature
   - T2: WHR930 to inside temperature
   - T3: Inside to WHR930 temperature
   - T4: WHR930 to outside temperature

4. **Number Platform (`whr930/number/`)**: Comfort temperature setting

## Technology Stack

- **Language**: C++ for hardware communication, Python for ESPHome configuration
- **Framework**: ESPHome component architecture
- **Hardware**: ESP8266/ESP32 microcontrollers
- **Communication**: UART (9600 baud) with custom Zehnder protocol
- **Target Platform**: ESPHome (external component)

## Coding Conventions

### Python Code (ESPHome Configuration)
- Follow ESPHome's component structure and naming conventions
- Use `esphome.codegen` for C++ code generation
- Use `esphome.config_validation` for YAML validation
- Follow existing patterns in `__init__.py` files for consistency
- Component IDs should use `CONF_` prefix for constants
- Use uppercase for enum values

### C++ Code
- **Namespace**: All code must be in `esphome::whr930` namespace
- **Indentation**: 2 spaces (no tabs)
- **Naming**:
  - Classes: PascalCase (e.g., `Whr930`, `Whr930Fan`)
  - Methods: snake_case (e.g., `execute_request`, `calculate_checksum`)
  - Variables: snake_case
  - Constants: As appropriate for ESPHome context
- **Header Guards**: Use `#pragma once`
- **Inheritance**: Follow ESPHome base classes:
  - `uart::UARTDevice` for UART communication
  - `Component` or `PollingComponent` for lifecycle management
  - Platform-specific bases (`fan::Fan`, `sensor::Sensor`, etc.)

### Protocol Implementation
- The WHR930 uses a specific protocol with:
  - Start bytes: `0x07 0xF0`
  - Command structure with checksums
  - Acknowledgment pattern: `0x07 0xF3`
  - End bytes: `0x07 0x0F`
- Always validate checksums on incoming data
- Clear buffers before sending commands to avoid stale data

## Building and Testing

### Prerequisites
This is an external component, so it doesn't have a standalone build process. It's meant to be used within an ESPHome configuration.

### Testing with ESPHome
1. Create or use an ESPHome YAML configuration (see `test_components.yaml`)
2. Reference this component as an external component:
   ```yaml
   external_components:
     - source: esphome/components
   ```
3. Compile with ESPHome CLI:
   ```bash
   esphome compile test_components.yaml
   ```
4. Upload to ESP device:
   ```bash
   esphome upload test_components.yaml
   ```

### Example Configuration
See `test_components.yaml` for a complete working example with:
- ESP8266 D1 Mini configuration
- UART setup (TX: GPIO0, RX: GPIO1, 9600 baud)
- Fan, sensor, and number component examples

## Development Guidelines

### Making Changes
1. **Understand the WHR930 protocol** before modifying communication code
2. **Test with actual hardware** when possible - this component controls physical HVAC equipment
3. **Maintain backward compatibility** - users rely on this component in production
4. **Follow ESPHome patterns** - study existing ESPHome components for reference
5. **Update `test_components.yaml`** if adding new features

### Adding New Features
1. Create new platform directory under `esphome/components/whr930/`
2. Add `__init__.py` for Python configuration code
3. Add C++ header file for implementation
4. Register component in parent `__init__.py` if needed
5. Add example to `test_components.yaml`

### Common Patterns
- Use `CONF_WHR930_ID` to reference the parent component
- Extend platform schemas with `AUTO_LOAD = ["whr930"]`
- Use `cv.use_id(Whr930)` to link child components to parent
- Implement `to_code()` async function for code generation

## Important Notes

### Safety and Hardware
- This component controls ventilation equipment - **test thoroughly**
- Incorrect commands could affect air quality or equipment operation
- Always validate protocol implementation against WHR930 specifications
- Consider timeouts and error handling for UART communication

### ESPHome Compatibility
- Follow ESPHome breaking changes and deprecation notices
- Test with current ESPHome versions
- This is an **external component** - users install it separately from ESPHome core

### File Organization
- Keep platform implementations in separate subdirectories
- Use consistent naming: `whr930_*.h` for C++ headers
- Python files are always `__init__.py` in platform directories

## Getting Help

- ESPHome documentation: https://esphome.io/
- ESPHome custom components guide: https://esphome.io/custom/custom_component.html
- Zehnder WHR930 protocol documentation (if available)

## Common Tasks for Copilot

When working on issues, you should:
1. ✅ **Maintain the external component structure** - don't reorganize into a different pattern
2. ✅ **Test compilation** with ESPHome when making C++ changes
3. ✅ **Update test_components.yaml** when adding new features or platforms
4. ✅ **Follow existing code style** - consistency is key for maintainability
5. ✅ **Validate protocol changes carefully** - UART communication is sensitive
6. ✅ **Consider backward compatibility** - many users depend on this component
7. ❌ **Don't add new dependencies** unless absolutely necessary - keep it lightweight
8. ❌ **Don't break existing platform APIs** without good reason and documentation
9. ❌ **Don't modify .gitignore to include build artifacts** - ESPHome handles its own build directory

## Additional Context

This component was created to enable home automation integration with Zehnder WHR930 ventilation units, which are popular in European homes. The UART protocol is reverse-engineered and may not cover all WHR930 features. Any additions should be tested with real hardware when possible.
