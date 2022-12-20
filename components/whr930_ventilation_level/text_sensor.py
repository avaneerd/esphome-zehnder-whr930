import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import text_sensor
from esphome.const import CONF_ID, CONF_ICON
from esphome.core import coroutine
from . import Whr930VentilationLevelComponent, CONF_WHR930_VENTILATION_LEVEL_ID

DEPENDENCIES = ["bme680_bsec"]

CONF_SUPPLY_FAN_ACTIVE = "supply_fan_active"
ICON_FAN_CHEVRON_DOWN = "mdi:fan-chevron-down"

TYPES = [CONF_SUPPLY_FAN_ACTIVE]

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_VENTILATION_LEVEL_ID): cv.use_id(Whr930VentilationLevelComponent),
        cv.Optional(CONF_SUPPLY_FAN_ACTIVE): text_sensor.TEXT_SENSOR_SCHEMA.extend(
            {
                cv.GenerateID(): cv.declare_id(text_sensor.TextSensor),
                cv.Optional(CONF_ICON, default=ICON_FAN_CHEVRON_DOWN): cv.icon,
            }
        ),
    }
)


@coroutine
def setup_conf(config, key, hub):
    if key in config:
        conf = config[key]
        sens = cg.new_Pvariable(conf[CONF_ID])
        yield text_sensor.register_text_sensor(sens, conf)
        cg.add(getattr(hub, f"set_{key}_text_sensor")(sens))


def to_code(config):
    hub = yield cg.get_variable(config[CONF_WHR930_VENTILATION_LEVEL_ID])
    for key in TYPES:
        yield setup_conf(config, key, hub)