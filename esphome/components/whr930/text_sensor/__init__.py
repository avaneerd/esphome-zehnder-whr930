import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import text_sensor
from esphome.const import CONF_ID

from .. import CONF_WHR930_ID, whr930_ns, Whr930

DEPENDENCIES = ["whr930"]

CONF_FILTER_STATUS = "filter_status"
CONF_ERROR_A = "error_a"
CONF_ERROR_E = "error_e"
CONF_ERROR_EA = "error_ea"

Whr930FilterStatus = whr930_ns.class_(
    "Whr930FilterStatus", cg.PollingComponent
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.GenerateID(): cv.declare_id(Whr930FilterStatus),
        cv.Optional(CONF_FILTER_STATUS): text_sensor.text_sensor_schema(),
        cv.Optional(CONF_ERROR_A): text_sensor.text_sensor_schema(),
        cv.Optional(CONF_ERROR_E): text_sensor.text_sensor_schema(),
        cv.Optional(CONF_ERROR_EA): text_sensor.text_sensor_schema(),
    }
).extend(cv.COMPONENT_SCHEMA)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    var = cg.new_Pvariable(config[CONF_ID], parent)
    await cg.register_component(var, config)

    if conf := config.get(CONF_FILTER_STATUS):
        sens = await text_sensor.new_text_sensor(conf)
        cg.add(var.set_filter_status_sensor(sens))

    if conf := config.get(CONF_ERROR_A):
        sens = await text_sensor.new_text_sensor(conf)
        cg.add(var.set_error_a_sensor(sens))

    if conf := config.get(CONF_ERROR_E):
        sens = await text_sensor.new_text_sensor(conf)
        cg.add(var.set_error_e_sensor(sens))

    if conf := config.get(CONF_ERROR_EA):
        sens = await text_sensor.new_text_sensor(conf)
        cg.add(var.set_error_ea_sensor(sens))
