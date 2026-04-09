import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import sensor
from esphome.const import (
    CONF_ID,
    UNIT_CELSIUS,
    UNIT_PERCENT,
    DEVICE_CLASS_TEMPERATURE,
    STATE_CLASS_MEASUREMENT,
)

from .. import CONF_WHR930_ID, whr930_ns, Whr930

DEPENDENCIES = ["whr930"]

CONF_T1_TEMPERATURE = "t1_temperature"
CONF_T2_TEMPERATURE = "t2_temperature"
CONF_T3_TEMPERATURE = "t3_temperature"
CONF_T4_TEMPERATURE = "t4_temperature"
CONF_BYPASS_POSITION = "bypass_position"

Whr930Sensors = whr930_ns.class_(
    "Whr930Sensors", cg.PollingComponent
)

CONFIG_SCHEMA = cv.All(
    cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.GenerateID(): cv.declare_id(Whr930Sensors),
        cv.Optional(CONF_T1_TEMPERATURE): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1,
        ),
        cv.Optional(CONF_T2_TEMPERATURE): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1,
        ),
        cv.Optional(CONF_T3_TEMPERATURE): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1,
        ),
        cv.Optional(CONF_T4_TEMPERATURE): sensor.sensor_schema(
            unit_of_measurement=UNIT_CELSIUS,
            device_class=DEVICE_CLASS_TEMPERATURE,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=1,
        ),
        cv.Optional(CONF_BYPASS_POSITION): sensor.sensor_schema(
            unit_of_measurement=UNIT_PERCENT,
            state_class=STATE_CLASS_MEASUREMENT,
            accuracy_decimals=0,
        ),
    }
    ).extend(cv.COMPONENT_SCHEMA)
)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    var = cg.new_Pvariable(config[CONF_ID], parent)
    await cg.register_component(var, config)

    if conf := config.get(CONF_T1_TEMPERATURE):
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t1_temperature_sensor(sens))

    if conf := config.get(CONF_T2_TEMPERATURE):
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t2_temperature_sensor(sens))

    if conf := config.get(CONF_T3_TEMPERATURE):
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t3_temperature_sensor(sens))

    if conf := config.get(CONF_T4_TEMPERATURE):
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_t4_temperature_sensor(sens))

    if conf := config.get(CONF_BYPASS_POSITION):
        sens = await sensor.new_sensor(conf)
        cg.add(var.set_bypass_position_sensor(sens))
