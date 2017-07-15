# grafana-prtg
A PRTG Datasource plugin for Grafana (BETA!!)

Works with 4.x - just drop the "jasonlashua-prtg-datasource" folder into the "data/plugins" folder of your Grafana installation and restart the grafana server.
# CHANGELOG

## July 15, 2017 - Version 4.0!
This version contains many great enhancements and hopefully addresses some of the open issues.

### Templating Support

* Template queries now return ALL items
* Multiple-value variables are fully supported

**Template query examples:**
"group:*" returns all groups
"device:group=$group" returns all devices that exist in the variable named "$group"
"sensor:device=$device" returns all sensors that belong to the devices in the variable named "$device"

### Query Editor

* Full regex support! Regular expressions can be used to create powerful queries that return many items ...in a single query!
* Multiple-value variables support! For instance, if a template variable "$groups" is selected, and the that variable contains two groups, the "device" query is filtered accordingly.

### Other

When using a single query that returns data from multiple hosts, the alias for each item includes the hostname. However, this does not work with multiple individual host queries, i.e., it's a bug.

Also I do not ignore the issues - I really only get a few days every few months to work on this, unfortunately. I will continue addressing all issues that I can. 
**THANK YOU FOR USING THIS PLUGIN!**


#IMPORTANT INFORMATION AS OF 2/18/2017
You must reconfigure your datasource and use the passhash for your PRTG api user account. The plugin no longer uses the password!

![Grafana](https://neuralfraud.github.io/grafana.png)

Currently relies on XSLT to transform XML table results into JSON. The reason for this is due to the way PRTG outputs data, both in JSON and XML. 

Based on the grafana-zabbix plugin which seemed like a reasonbly similar example to use.

There are probably a lot of issues and WTFs here. It's a work in progress!

I hope this is useful to anyone currently using PRTG.

For more information, see [The Grafana-PRTG Wiki](https://github.com/neuralfraud/grafana-prtg/wiki)


