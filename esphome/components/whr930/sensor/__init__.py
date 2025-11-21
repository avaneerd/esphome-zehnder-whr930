import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import sensor
from esphome.const import (
    CONF_ID,
    UNIT_CELSIUS,
    UNIT_PERCENT,
    DEVICE_CLASS_TEMPERATURE,
    STATE_CLASS_MEASUREMENT
)

from .. import CONF_WHR930_ID, whr930_ns, Whr930

Whr930Temperatures = whr930_ns.class_(
    "Whr930Temperatures", cg.PollingComponent
)

AUTO_LOAD = ["whr930"]

CONFIG_SCHEMA = cv.All(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.GenerateID(): cv.declare_id(Whr930Temperatures),
        cv.Optional("t1_temperature"): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1).extend(cv.COMPONENT_SCHEMA),
        cv.Optional("t2_temperature"): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1).extend(cv.COMPONENT_SCHEMA),
        cv.Optional("t3_temperature"): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1).extend(cv.COMPONENT_SCHEMA),
        cv.Optional("t4_temperature"): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1).extend(cv.COMPONENT_SCHEMA),
        cv.Optional("bypass_position"): sensor.sensor_schema(
            unit_of_measurement=UNIT_PERCENT,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=0).extend(cv.COMPONENT_SCHEMA),
    }
)

async def to_code(config):
    id = config[CONF_ID]
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    var = cg.new_Pvariable(id, parent)
    await cg.register_component(var, config)

    if "t1_temperature" in config:
        conf = config["t1_temperature"]
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t1_temperature_sensor(sens))

    if "t2_temperature" in config:
        conf = config["t2_temperature"]
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t2_temperature_sensor(sens))

    if "t3_temperature" in config:
        conf = config["t3_temperature"]
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t3_temperature_sensor(sens))

    if "t4_temperature" in config:
        conf = config["t4_temperature"]
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t4_temperature_sensor(sens))

    if "bypass_position" in config:
        conf = config["bypass_position"]
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_bypass_position_sensor(sens))