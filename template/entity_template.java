package <%-entity_pkg_name-%>;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

/**
 * <%=entity_desc%>
 */
@Entity
@Table(name = "<%-table_name-%>")
public class <%-entity_name-%> extends <%-base_entity-%> {

	public static final String TABLE_NAME_<%-table_name-%> = "<%-table_name-%>";

<% //字段名 %>
<% for (var i=0; i<col_defs.length; i++) { %>
	/**
	 * <%=col_defs[i].comment%>
	 */
	public static final String COL_NAME_<%-col_defs[i].name-%> = "<%-col_defs[i].name-%>";
<% } %>

<% //类属性 %>
<% for (var i=0; i<col_defs.length; i++) { %>
	/**
	 * <%=col_defs[i].comment%>
	 */
	 <% for (var j=0; j<col_defs[i].annotations.length; j++) { %>
	<%-col_defs[i].annotations[j]-%>
	 <% } %>
	private <%-col_defs[i].type-%> <%-col_defs[i].property_name-%>;
<% } %>

<% //类属性方法 %>
	<% for (var i=0; i<col_defs.length; i++) { %>

	/**
	 * <%=col_defs[i].comment%>
	 */
	public <%-col_defs[i].type-%> get<%-col_defs[i].property_method_name-%>() {
		return <%-col_defs[i].property_name-%>;
	}

	/**
	 * <%=col_defs[i].comment%>
	 */
	public void set<%-col_defs[i].property_method_name-%>(<%-col_defs[i].type-%> <%-col_defs[i].property_name-%>) {
		this.<%-col_defs[i].property_name-%> = <%-col_defs[i].property_name-%>;
	}
<% } %>
}
