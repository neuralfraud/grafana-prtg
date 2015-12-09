# grafana-prtg
A PRTG Datasource plugin for Grafana (BETA!!)

Works with Grafana-2.6.0 beta
Currently relies on XSLT to transform XML table results into JSON. The reason for this is due to the way PRTG outputs data, both in JSON and XML. 

Based on the grafana-zabbix plugin which seemed like a reasonbly similar example to use.

There are probably a lot of issues and WTFs here. It's a work in progress!

This plugin does not yet implement annotations or historic data. Further, there are issues with singleStat panels. The number values contain four decimal places, and for some reason it seems to hang up when processing (for instance specifying the unit, or conditional coloring)

I hope this is useful to anyone currently using PRTG.

