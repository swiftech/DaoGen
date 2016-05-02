package <%-dao_pkg_name-%>.impl;

import org.springframework.stereotype.Repository;
import <%-base_dao_impl-%>;
import <%-entity_pkg_name-%>.<%-entity_name-%>;
import <%-dao_package_name-%>.<%-dao_name-%>;
/**
 * <%=dao_desc%>
 */
@Repository
public class <%-dao_name-%>Impl extends <%-base_dao_impl_name-%><<%-entity_name-%>> implements <%-dao_name-%> {

}
