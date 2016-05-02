package <%-dao_pkg_name-%>;

import org.springframework.transaction.annotation.Transactional;
import <%-base_dao-%>;
import <%-entity_pkg_name-%>.<%-entity_name-%>;

/**
 * <%=dao_desc%>
 */
@Transactional
public interface <%-dao_name-%> extends <%-base_dao_name-%><<%-entity_name-%>> {
}
