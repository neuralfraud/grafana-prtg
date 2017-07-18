"use strict";

System.register([], function (_export, _context) {
    "use strict";

    var XMLXform;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [],
        execute: function () {
            _export("XMLXform", XMLXform = function XMLXform(method, xmlString) {
                _classCallCheck(this, XMLXform);

                this.xml = undefined;
                this.xslt = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n<xsl:stylesheet version=\"1.0\" xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\">\n    <!--<xsl:output method=\"text\" encoding=\"utf-8\"/>-->\n\n<xsl:key name=\"kvalue\" match=\"value\" use=\"@channelid\" />\n<xsl:key name=\"kvalue_raw\" match=\"value_raw\" use=\"@channelid\" />\n\n\n <xsl:template match=\"histdata\">\n    <xsl:copy>\n        <xsl:apply-templates select=\"item\"/>\n    </xsl:copy>\n</xsl:template>\n\n<xsl:template match=\"item\">\n    <xsl:copy>\n        <xsl:apply-templates select=\"datetime\" />\n        <xsl:apply-templates select=\"datetime_raw\" />\n        <xsl:apply-templates select=\"value\">\n            <xsl:sort select=\"@channelid\" data-type=\"number\" order=\"ascending\" />\n        </xsl:apply-templates>\n        <xsl:apply-templates select=\"value_raw\">\n            <xsl:sort select=\"@channelid\" data-type=\"number\" order=\"ascending\" />\n        </xsl:apply-templates>\n    </xsl:copy>\n</xsl:template>\n<xsl:template match=\"item\">\n    <xsl:copy>\n        <xsl:copy-of select=\"datetime\" />\n        <xsl:copy-of select=\"datetime_raw\" />\n        <xsl:copy-of select=\"value\" />\n        <xsl:copy-of select=\"value_raw\" />\n    </xsl:copy>\n</xsl:template>\n</xsl:stylesheet>\n";

                this.xslt2 = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n<xsl:stylesheet version=\"1.0\" xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\">\n    <xsl:output method=\"text\" encoding=\"utf-8\"/>\n \n    <xsl:template match=\"/*[node()]\">\n        <xsl:text>{</xsl:text>\n        <xsl:apply-templates select=\".\" mode=\"detect\" />\n        <xsl:text>}</xsl:text>\n    </xsl:template>\n \n    <xsl:template match=\"*\" mode=\"detect\">\n        <xsl:choose>\n            <xsl:when test=\"name(preceding-sibling::*[1]) = name(current()) and name(following-sibling::*[1]) != name(current())\">\n                    <xsl:apply-templates select=\".\" mode=\"obj-content\" />\n                <xsl:text>]</xsl:text>\n                <xsl:if test=\"count(following-sibling::*[name() != name(current())]) &gt; 0\">, </xsl:if>\n            </xsl:when>\n            <xsl:when test=\"name(preceding-sibling::*[1]) = name(current())\">\n                    <xsl:apply-templates select=\".\" mode=\"obj-content\" />\n                    <xsl:if test=\"name(following-sibling::*) = name(current())\">, </xsl:if>\n            </xsl:when>\n            <xsl:when test=\"following-sibling::*[1][name() = name(current())]\">\n                <xsl:text>\"</xsl:text><xsl:value-of select=\"name()\"/><xsl:text>\" : [</xsl:text>\n                    <xsl:apply-templates select=\".\" mode=\"obj-content\" /><xsl:text>, </xsl:text>\n            </xsl:when>\n            <xsl:when test=\"count(./child::*) > 0 or count(@*) > 0\">\n                <xsl:text>\"</xsl:text><xsl:value-of select=\"name()\"/>\" : <xsl:apply-templates select=\".\" mode=\"obj-content\" />\n                <xsl:if test=\"count(following-sibling::*) &gt; 0\">, </xsl:if>\n            </xsl:when>\n            <xsl:when test=\"count(./child::*) = 0\">\n                <xsl:text>\"</xsl:text><xsl:value-of select=\"name()\"/>\" : \"<xsl:apply-templates select=\".\"/><xsl:text>\"</xsl:text>\n                <xsl:if test=\"count(following-sibling::*) &gt; 0\">, </xsl:if>\n            </xsl:when>\n        </xsl:choose>\n    </xsl:template>\n \n    <xsl:template match=\"*\" mode=\"obj-content\">\n        <xsl:text>{</xsl:text>\n            <xsl:apply-templates select=\"@*\" mode=\"attr\" />\n            <xsl:if test=\"count(@*) &gt; 0 and (count(child::*) &gt; 0 or text())\">, </xsl:if>\n            <xsl:apply-templates select=\"./*\" mode=\"detect\" />\n            <xsl:if test=\"count(child::*) = 0 and text() and not(@*)\">\n                <xsl:text>\"</xsl:text><xsl:value-of select=\"name()\"/>\" : \"<xsl:value-of select=\"text()\"/><xsl:text>\"</xsl:text>\n            </xsl:if>\n            <xsl:if test=\"count(child::*) = 0 and text() and @*\">\n                <xsl:text>\"text\" : \"</xsl:text><xsl:value-of select=\"text()\"/><xsl:text>\"</xsl:text>\n            </xsl:if>\n        <xsl:text>}</xsl:text>\n        <xsl:if test=\"position() &lt; last()\">, </xsl:if>\n    </xsl:template>\n \n    <xsl:template match=\"@*\" mode=\"attr\">\n        <xsl:text>\"</xsl:text><xsl:value-of select=\"name()\"/>\" : \"<xsl:value-of select=\".\"/><xsl:text>\"</xsl:text>\n        <xsl:if test=\"position() &lt; last()\">,</xsl:if>\n    </xsl:template>\n \n    <xsl:template match=\"node/@TEXT | text()\" name=\"removeBreaks\">\n        <xsl:param name=\"pText\" select=\"normalize-space(.)\"/>\n        <xsl:choose>\n            <xsl:when test=\"not(contains($pText, '&#xA;'))\"><xsl:copy-of select=\"$pText\"/></xsl:when>\n            <xsl:otherwise>\n                <xsl:value-of select=\"concat(substring-before($pText, '&#xD;&#xA;'), ' ')\"/>\n                <xsl:call-template name=\"removeBreaks\">\n                    <xsl:with-param name=\"pText\" select=\"substring-after($pText, '&#xD;&#xA;')\"/>\n                </xsl:call-template>\n            </xsl:otherwise>\n        </xsl:choose>\n    </xsl:template>\n \n</xsl:stylesheet>\n";

                if (window.DOMParser) {
                    var parser = new DOMParser();
                    this.xml = parser.parseFromString(xmlString, "application/xml");
                    this.xslt = parser.parseFromString(this.xslt, "application/xml");
                    this.xslt2 = parser.parseFromString(this.xslt2, "application/xml");
                }
                var xsltProcessor = new XSLTProcessor();
                xsltProcessor.importStylesheet(this.xslt);
                var newxml = xsltProcessor.transformToDocument(this.xml);
                // Using a separate XSLTProcessor instance resolves issue with Firefox.
                var xsltProcessor2 = new XSLTProcessor();
                xsltProcessor2.importStylesheet(this.xslt2);
                var json = xsltProcessor2.transformToFragment(newxml, document).textContent;
                return JSON.parse(json);
            });

            _export("XMLXform", XMLXform);
        }
    };
});
//# sourceMappingURL=xmlparser.js.map
