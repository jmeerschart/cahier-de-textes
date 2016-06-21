package fr.openent.diary.services;

import fr.openent.diary.controllers.DiaryController;
import fr.openent.diary.utils.StringUtils;
import fr.wseduc.webutils.Either;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.service.impl.SqlCrudService;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.sql.SqlStatementsBuilder;
import org.vertx.java.core.Handler;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;
import org.vertx.java.core.logging.Logger;
import org.vertx.java.core.logging.impl.LoggerFactory;

import java.util.List;

import static org.entcore.common.sql.SqlResult.validUniqueResultHandler;

/**
 * Created by a457593 on 18/02/2016.
 */
public class DiaryServiceImpl extends SqlCrudService implements DiaryService {

    private final Neo4j neo = Neo4j.getInstance();
    private final static String DATABASE_TABLE ="teacher"; //TODO handle attachments manually or the opposite?
    private final static Logger log = LoggerFactory.getLogger(DiaryServiceImpl.class);
    private static final String TEACHER_ID_FIELD_NAME = "id";
    private static final String TEACHER_DISPLAY_NAME_FIELD_NAME = "teacher_display_name";

    public DiaryServiceImpl() {
        super(DiaryController.DATABASE_SCHEMA, DATABASE_TABLE);
    }

    @Override
    public void getOrCreateTeacher(final String teacherId, final String teacherDisplayName, final Handler<Either<String, JsonObject>> handler) {

            log.debug("getOrCreateTeacher: " + teacherId);
            if (StringUtils.isValidIdentifier(teacherId)) {
                retrieveTeacher(teacherId, new Handler<Either<String, JsonObject>>() {
                    @Override
                    public void handle(Either<String, JsonObject> event) {
                    if (event.isRight()) {
                        if (event.right().getValue().size() == 0) {
                            log.debug("No teacher, create it");
                            createTeacher(teacherId, teacherDisplayName, handler);
                        } else {
                            log.debug("Teacher found");
                            handler.handle(new Either.Right<String, JsonObject>(event.right().getValue().putBoolean("teacherFound", true)));
                        }
                    } else {
                        log.debug("error while retrieve teacher");
                        handler.handle(new Either.Left<String, JsonObject>(event.left().getValue()));
                    }
                    }
                });
            } else {
                String errorMessage = "Invalid teacher identifier.";
                log.debug(errorMessage);
                handler.handle(new Either.Left<String, JsonObject>(errorMessage));
            }
    }

    @Override
    public void retrieveTeacher(String teacherId, Handler<Either<String, JsonObject>> handler) {

        StringBuilder query = new StringBuilder();
        query.append("SELECT * FROM diary.teacher as t WHERE t.id = ?");

        JsonArray parameters = new JsonArray().add(Sql.parseId(teacherId));

        sql.prepared(query.toString(), parameters, validUniqueResultHandler(handler));
    }

    @Override
    public void createTeacher(final String teacherId, final String teacherDisplayName, final Handler<Either<String, JsonObject>> handler) {
        if(StringUtils.isValidIdentifier(teacherId)) { //TODO change to StringUtils/UUID utils?
            //insert teacher
            JsonObject teacherParams = new JsonObject();
            teacherParams.putString(TEACHER_ID_FIELD_NAME, teacherId);
            teacherParams.putString(TEACHER_DISPLAY_NAME_FIELD_NAME, teacherDisplayName);
            sql.insert("diary.teacher", teacherParams, "id", validUniqueResultHandler(handler));
        } else {
            String errorMessage = "Invalid teacher identifier.";
            handler.handle(new Either.Left<String, JsonObject>(errorMessage));
        }
    }

    @Override
    public void createSubject(JsonObject subjectObject, Handler<Either<String, JsonObject>> handler) {

    }

    @Override
    public void deleteSubject(String subjectId, Handler<Either<String, JsonObject>> handler) {

    }

    @Override
    public void listSubjects(final List<String> schoolIds, final String teacherId, final Handler<Either<String, JsonArray>> handler) {

        StringBuilder query = new StringBuilder();
        query.append("SELECT s.id as id, s.subject_label as label, s.school_id ")
        .append(" FROM diary.subject as s ")
        .append(" WHERE s.school_id in")
        .append(sql.listPrepared(schoolIds.toArray()));

        JsonArray parameters = new JsonArray();
        for (String schoolId : schoolIds) {
            parameters.add(Sql.parseId(schoolId));
        }

        if(teacherId != null && !teacherId.trim().isEmpty()){
            query.append(" and s.teacher_id = ? ");
            parameters.add(teacherId.trim());
        }

        sql.prepared(query.toString(), parameters, SqlResult.validResultHandler(handler));
    }

    @Override
    public void listAudiences(String schoolId, final Handler<Either<String, JsonArray>> handler) {

        StringBuilder query = new StringBuilder();
        query.append("SELECT * FROM diary.audience as s WHERE s.school_id = ?");

        JsonArray parameters = new JsonArray().add(Sql.parseId(schoolId));

        sql.prepared(query.toString(), parameters, SqlResult.validResultHandler(handler));
    }

    @Override
    public void createSubjects(List<JsonObject> subjectObjectList, Handler<Either<String, JsonObject>> handler) {

        SqlStatementsBuilder sb = new SqlStatementsBuilder();

        for (JsonObject subject : subjectObjectList) {
            sb.insert("diary.subject", subject, "id");
        }

        sql.transaction(sb.build(), validUniqueResultHandler(0, handler));
    }

    public void getSubjects(final String schoolId, final String teacherId, final Handler<Either<String, JsonArray>> handler) {

        StringBuilder query = new StringBuilder("MATCH (m:FieldOfStudy)");
        query.append(" WHERE ");
        query.append(" return m limit 10;");


    }

}
