package <%-dao_pkg_name-%>;

import org.springframework.transaction.annotation.Transactional;
import <%-base_dao-%>;
import <%-entity_pkg_name-%>.<%-entity_class_name-%>;

import java.util.List;

/**
 * <%=dao_desc%>
 */
@Transactional
public interface <%-dao_name-%> extends <%-base_dao_name-%><<%-entity_class_name-%>> {

  /**
   * 根据 ID 查找<%=dao_desc%>
   */
  <%-entity_class_name-%> find<%-entity_name-%>(String id);

  /**
   * 查找所有<%=dao_desc%>
   */
  List<<%-entity_class_name-%>> findAll<%-entity_name-%>();
}
