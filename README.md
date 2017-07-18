# PRTG Datasource for Grafana

[![GitHub version](https://badge.fury.io/gh/neuralfraud%2Fgrafana-prtg.svg)](https://badge.fury.io/gh/neuralfraud%2Fgrafana-prtg)
[![Change Log](https://img.shields.io/badge/change-log-blue.svg?style=flat)](https://github.com/neuralfraud/grafana-prtg/blob/master/CHANGELOG.md)
[![Docs](https://img.shields.io/badge/docs-latest-red.svg?style=flat)](https://github.com/neuralfraud/grafana-prtg/wiki)
[![Donate](https://img.shields.io/badge/donate-paypal-2c9eda.svg?style=flat&colorA=0b3684)](https://paypal.me/jaylashua/10)

Works with 4.x - just drop the "jasonlashua-prtg-datasource" folder into the "data/plugins" folder of your Grafana installation and restart the grafana server.

## July 15, 2017 - Version 4.0

This version contains many great enhancements and hopefully addresses some of the open issues.

### Templating Support

* Multiple-value variables are fully supported
* Use other template variables in your queries

**Template query examples:**
"group:*" returns all groups
"device:group=$group" returns all devices that exist in the variable named "$group"
"sensor:device=$device" returns all sensors that belong to the devices in the variable named "$device"

### Query Editor

* Full regex support! Regular expressions can be used to create powerful queries that return many items ...in a single query!
* Multiple-value variables support! For instance, if a template variable "$groups" is selected, and the that variable contains two groups, the "device" query is filtered accordingly.
* Support for text and other PRTG properties, including tags, active, status, messages, priority, and more!
* Support for raw JSON (for creating custom tables with the table panel)

### Other

It is now possible to create table panels and other useful displays using PRTG object properties and text!

![Grafana](https://neuralfraud.github.io/textPropertyDash.png)

**THANK YOU FOR USING THIS PLUGIN!**

For more information, see [The Grafana-PRTG Wiki](https://github.com/neuralfraud/grafana-prtg/wiki)