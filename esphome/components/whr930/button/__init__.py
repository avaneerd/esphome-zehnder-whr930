import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import button
from esphome.const import CONF_ID, ENTITY_CATEGORY_CONFIG

from .. import CONF_WHR930_ID, whr930_ns, Whr930

DEPENDENCIES = ["whr930"]

CONF_RESET_FILTER = "reset_filter"

Whr930ResetFilterButton = whr930_ns.class_(
    "Whr930ResetFilterButton", cg.Component, button.Button
)

CONFIG_SCHEMA = cv.All(
    cv.Schema(
    {
        cv.GenerateID(CONF_WHR930_ID): cv.use_id(Whr930),
        cv.GenerateID(): cv.declare_id(Whr930ResetFilterButton),
        cv.Required(CONF_RESET_FILTER): button.button_schema(
            Whr930ResetFilterButton,
            entity_category=ENTITY_CATEGORY_CONFIG,
        ),
    }
    ).extend(cv.COMPONENT_SCHEMA)
)

async def to_code(config):
    parent = await cg.get_variable(config[CONF_WHR930_ID])
    var = cg.new_Pvariable(config[CONF_ID], parent)
    await cg.register_component(var, config)
    conf = config[CONF_RESET_FILTER]
    await button.register_button(var, conf)
