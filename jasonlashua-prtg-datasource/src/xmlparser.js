/**
 * Grafana Datasource Plugin for PRTG API Interface
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
 * the nodes being unrelated results in repeat objects.
 *
 * first xsl sorts nodes by name, such that all <value> elements are
 * together, and all <value_raw> elements are together.
 * This results in arrays being created, which we can use.
 *
 */
export class XMLXform {
  constructor(method, xmlString) {
    
    this.xml = undefined;
    this.xslt = `<?xml version="1.0" encoding="UTF-8" ?>
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

    this.xslt2 = `<?xml version="1.0" encoding="UTF-8" ?>
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

    if (window.DOMParser) {
      const parser = new DOMParser();  
      this.xml = parser.parseFromString(xmlString, "application/xml");
      this.xslt = parser.parseFromString(this.xslt, "application/xml");
      this.xslt2 = parser.parseFromString(this.xslt2, "application/xml");
    }
    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(this.xslt);
    const newxml = xsltProcessor.transformToDocument(this.xml);
    // Using a separate XSLTProcessor instance resolves issue with Firefox.
    const xsltProcessor2 = new XSLTProcessor();
    xsltProcessor2.importStylesheet(this.xslt2);
    const json = xsltProcessor2.transformToFragment(newxml, document).textContent;
    return JSON.parse(json);
  }
}

