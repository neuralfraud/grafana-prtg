# grafana-prtg
A PRTG Datasource plugin for Grafana (BETA!!)

Works with 4.x - just drop the "jasonlashua-prtg-datasource" folder into the "data/plugins" folder of your Grafana installation and restart the grafana server.

![Grafana](https://neuralfraud.github.io/grafana.png)

Currently relies on XSLT to transform XML table results into JSON. The reason for this is due to the way PRTG outputs data, both in JSON and XML. 

Based on the grafana-zabbix plugin which seemed like a reasonbly similar example to use.

There are probably a lot of issues and WTFs here. It's a work in progress!

I hope this is useful to anyone currently using PRTG.

For more information, see [The Grafana-PRTG Wiki](https://github.com/neuralfraud/grafana-prtg/wiki)


