/**
 * Grafana Datasource Plugin for PRTG API Interface (ALPHA)
 * XML Transformation and Conversion to JSON
 * 
 * 20151206 03:10 Jason Lashua
 * Proof of Concept. Based on publicly available plugins.
 *
 * PRTG sends data by channel, both formatted and raw, so like:
 * value 100%, channel 1
 * value_raw 100%, channel 1
 * value 3 gb/s, channel 2
 * value_raw 30492059, channel 2
 *
 * 1: rearrange XML so we can build arrays of objects.
 * 2: parse transformed XML and convert to JSON
 */
xmlXform = function (method, xmlString) {
    
xmlXform.xml = undefined;
xmlXform.xslt = `<?xml version="1.0" encoding="UTF-8" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <!--<xsl:output method="text" encoding="utf-8"/>-->

<xsl:key name="kvalue" match="value" use="@channelid" />
<xsl:key name="kvalue_raw" match="value_raw" use="@channelid" />


 <xsl:template match="histdata">
    <xsl:copy>
        <xsl:apply-templates select="item"/>
    </xsl:copy>
</xsl:template>

<xsl:template match="item">
    <xsl:copy>
        <xsl:apply-templates select="datetime" />
        <xsl:apply-templates select="datetime_raw" />
        <xsl:apply-templates select="value">
            <xsl:sort select="@channelid" data-type="number" order="ascending" />
        </xsl:apply-templates>
        <xsl:apply-templates select="value_raw">
            <xsl:sort select="@channelid" data-type="number" order="ascending" />
        </xsl:apply-templates>
    </xsl:copy>
</xsl:template>
<xsl:template match="item">
    <xsl:copy>
        <xsl:copy-of select="datetime" />
        <xsl:copy-of select="datetime_raw" />
        <xsl:copy-of select="value" />
        <xsl:copy-of select="value_raw" />
    </xsl:copy>
</xsl:template>
</xsl:stylesheet>
`;

xmlXform.xslt2 = `<?xml version="1.0" encoding="UTF-8" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="utf-8"/>
 
    <xsl:template match="/*[node()]">
        <xsl:text>{</xsl:text>
        <xsl:apply-templates select="." mode="detect" />
        <xsl:text>}</xsl:text>
    </xsl:template>
 
    <xsl:template match="*" mode="detect">
        <xsl:choose>
            <xsl:when test="name(preceding-sibling::*[1]) = name(current()) and name(following-sibling::*[1]) != name(current())">
                    <xsl:apply-templates select="." mode="obj-content" />
                <xsl:text>]</xsl:text>
                <xsl:if test="count(following-sibling::*[name() != name(current())]) &gt; 0">, </xsl:if>
            </xsl:when>
            <xsl:when test="name(preceding-sibling::*[1]) = name(current())">
                    <xsl:apply-templates select="." mode="obj-content" />
                    <xsl:if test="name(following-sibling::*) = name(current())">, </xsl:if>
            </xsl:when>
            <xsl:when test="following-sibling::*[1][name() = name(current())]">
                <xsl:text>"</xsl:text><xsl:value-of select="name()"/><xsl:text>" : [</xsl:text>
                    <xsl:apply-templates select="." mode="obj-content" /><xsl:text>, </xsl:text>
            </xsl:when>
            <xsl:when test="count(./child::*) > 0 or count(@*) > 0">
                <xsl:text>"</xsl:text><xsl:value-of select="name()"/>" : <xsl:apply-templates select="." mode="obj-content" />
                <xsl:if test="count(following-sibling::*) &gt; 0">, </xsl:if>
            </xsl:when>
            <xsl:when test="count(./child::*) = 0">
                <xsl:text>"</xsl:text><xsl:value-of select="name()"/>" : "<xsl:apply-templates select="."/><xsl:text>"</xsl:text>
                <xsl:if test="count(following-sibling::*) &gt; 0">, </xsl:if>
            </xsl:when>
        </xsl:choose>
    </xsl:template>
 
    <xsl:template match="*" mode="obj-content">
        <xsl:text>{</xsl:text>
            <xsl:apply-templates select="@*" mode="attr" />
            <xsl:if test="count(@*) &gt; 0 and (count(child::*) &gt; 0 or text())">, </xsl:if>
            <xsl:apply-templates select="./*" mode="detect" />
            <xsl:if test="count(child::*) = 0 and text() and not(@*)">
                <xsl:text>"</xsl:text><xsl:value-of select="name()"/>" : "<xsl:value-of select="text()"/><xsl:text>"</xsl:text>
            </xsl:if>
            <xsl:if test="count(child::*) = 0 and text() and @*">
                <xsl:text>"text" : "</xsl:text><xsl:value-of select="text()"/><xsl:text>"</xsl:text>
            </xsl:if>
        <xsl:text>}</xsl:text>
        <xsl:if test="position() &lt; last()">, </xsl:if>
    </xsl:template>
 
    <xsl:template match="@*" mode="attr">
        <xsl:text>"</xsl:text><xsl:value-of select="name()"/>" : "<xsl:value-of select="."/><xsl:text>"</xsl:text>
        <xsl:if test="position() &lt; last()">,</xsl:if>
    </xsl:template>
 
    <xsl:template match="node/@TEXT | text()" name="removeBreaks">
        <xsl:param name="pText" select="normalize-space(.)"/>
        <xsl:choose>
            <xsl:when test="not(contains($pText, '&#xA;'))"><xsl:copy-of select="$pText"/></xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="concat(substring-before($pText, '&#xD;&#xA;'), ' ')"/>
                <xsl:call-template name="removeBreaks">
                    <xsl:with-param name="pText" select="substring-after($pText, '&#xD;&#xA;')"/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
 
</xsl:stylesheet>
`;

    var json;
    if (window.DOMParser) {
        var parser = new DOMParser();  
        xmlXform.xml = parser.parseFromString(xmlString, "application/xml");
        xmlXform.xslt = parser.parseFromString(xmlXform.xslt, "application/xml");
        xmlXform.xslt2 = parser.parseFromString(xmlXform.xslt2, "application/xml");
    }
    if (window.ActiveXObject) {
        xmlXform.xml = new ActiveXObject("Microsoft.XMLDOM");
        xmlXform.xml.async = false;
        xmlXform.xml.loadXML(xmlString);
        json = xmlXform.xml.transformNode(xmlXform.xslt);
    }
    else if (document.implementation && document.implementation.createDocument)
	{
		var xsltProcessor = new XSLTProcessor();
//        if (method == "table.xml") {
            xsltProcessor.importStylesheet(xmlXform.xslt);
            newxml = xsltProcessor.transformToDocument(xmlXform.xml);
            xsltProcessor.importStylesheet(xmlXform.xslt2);
            json = xsltProcessor.transformToFragment(newxml, document).textContent;
			//nsole.log("--- JSON ---\n\n" + json);
//        } else {
//            xsltProcessor.importStylesheet(xmlXform.xslt2);
//            json = xsltProcessor.transformToFragment(xmlXform, document).textContent;
//        }
	}
    return JSON.parse(json);
}
