package <%-dao_pkg_name-%>.impl;

import org.springframework.stereotype.Repository;
import <%-base_dao_impl-%>;
import <%-entity_pkg_name-%>.<%-entity_class_name-%>;
import <%-dao_pkg_name-%>.<%-dao_name-%>;

import java.util.List;

/**
 * <%=dao_desc%>
 */
@Repository
public class <%-dao_name-%>Impl extends <%-base_dao_impl_name-%><<%-entity_class_name-%>> implements <%-dao_name-%> {

  /**
   * 根据 ID 查找<%=dao_desc%>
   */
  public <%-entity_class_name-%> find<%-entity_name-%>(String id) {
    return null;
  }

  /**
   * 查找所有<%=dao_desc%>
   */
  public List<<%-entity_class_name-%>> findAll<%-entity_name-%>(){
    return null;
  }
}
