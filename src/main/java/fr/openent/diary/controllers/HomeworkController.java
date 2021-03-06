package fr.openent.diary.controllers;

import fr.openent.diary.filters.HomeworkAccessFilter;
import fr.openent.diary.model.HandlerResponse;
import fr.openent.diary.model.util.KeyValueModel;
import fr.openent.diary.services.*;
import fr.openent.diary.model.general.Audience;
import fr.wseduc.rs.*;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.Either;
import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.request.RequestUtils;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.entcore.common.utils.StringUtils;
import org.vertx.java.core.Handler;
import org.vertx.java.core.http.HttpServerRequest;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;
import org.vertx.java.core.logging.Logger;
import org.vertx.java.core.logging.impl.LoggerFactory;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.entcore.common.http.response.DefaultResponseHandler.*;

/**
 * Created by a457593 on 23/02/2016.
 */
public class HomeworkController extends ControllerHelper {

    private HomeworkService homeworkService;
    private LessonService lessonService;
    private AudienceService audienceService;
    private SharedService sharedService;
    private DiaryService diaryService;

    List<String> actionsForAutomaticSharing;

    //Permissions
    private static final String view_resource = "diary.read";
    private static final String manage_resource = "diary.manager";
    private static final String publish_resource = "diary.publish";
    private static final String list_homeworks = "diary.list.homeworks";
    private static final String list_homework_types = "diary.list.homeworktypes";
    private static final String list_homeworks_by_lesson = "diary.list.homeworks.lesson";
    private static final String list_homeworks_load = "diary.list.homeworkloads";


    private static final String sharing_action_read = "fr-openent-diary-controllers-HomeworkController|getHomework";
    private static final String sharing_action_list = "fr-openent-diary-controllers-HomeworkController|listHomeworks";
    private static final String sharing_action_list_by_lesson = "fr-openent-diary-controllers-HomeworkController|listHomeworkByLesson";

    private final static Logger log = LoggerFactory.getLogger(HomeworkController.class);

    public HomeworkController(HomeworkService homeworkService, LessonService lessonService, AudienceService audienceService, DiaryService diaryService) {
        this.homeworkService = homeworkService;
        this.lessonService = lessonService;
        this.audienceService = audienceService;
        this.diaryService = diaryService;
        this.sharedService = new SharedServiceImpl(HomeworkController.class.getName());

        //init automatic sharing actionsForAutomaticSharing
        actionsForAutomaticSharing = new ArrayList<String>(Arrays.asList(sharing_action_read, sharing_action_list, sharing_action_list_by_lesson));
    }


    @Get("/homework/:id")
    @ApiDoc("Get a homework using its identifier")
    @SecuredAction(value = view_resource, type = ActionType.RESOURCE)
    @ResourceFilter(HomeworkAccessFilter.class)
    public void getHomework(final HttpServerRequest request) {
        final String homeworkId = request.params().get("id");

        if (isValidHomeworkId(homeworkId)) {
            UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
                @Override
                public void handle(final UserInfos user) {
                    if (user != null) {
                        homeworkService.retrieveHomework(homeworkId, notEmptyResponseHandler(request, 201));
                    } else {
                        log.debug("User not found in session.");
                        unauthorized(request, "No user found in session.");
                    }
                }
            });
        } else {
            badRequest(request, "Invalid homework identifier.");
        }
    }

    @Get("/homework/list/:lessonId")
    @ApiDoc("Get all homeworks for a lesson")
    @SecuredAction(value = list_homeworks_by_lesson, type = ActionType.AUTHENTICATED)
    public void listHomeworkByLesson(final HttpServerRequest request) {
        final String lessonId = request.params().get("lessonId");

        //TODO for students what about visibility of free homeworks? depending on due date and current date
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(UserInfos user) {
                if (user != null) {
                    homeworkService.getAllHomeworksForALesson(user.getUserId(), lessonId, user.getGroupsIds(), arrayResponseHandler(request));
                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }


    @Get("/homework/external/list/:lessonId")
    @ApiDoc("Get all homeworks for a lesson")
    @SecuredAction(value = list_homeworks_by_lesson, type = ActionType.AUTHENTICATED)
    public void externalListHomeworkByLesson(final HttpServerRequest request) {
        final String lessonId = request.params().get("lessonId");

        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(UserInfos user) {
                if (user != null) {
                    homeworkService.getExternalHomeworkByLessonId(user.getUserId(), lessonId, user.getGroupsIds(), arrayResponseHandler(request));
                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }




   /* @Get("/homework/external/list/:lessonId")
    @ApiDoc("Get all homeworks for a lesson")
    @SecuredAction(value = list_homeworks_by_lesson, type = ActionType.AUTHENTICATED)
    public void listExternalHomeworkByLesson(final HttpServerRequest request) {
        final String lessonId = request.params().get("lessonId");

        //TODO for students what about visibility of free homeworks? depending on due date and current date
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    diaryService.listGroupsFromChild(Arrays.asList(user.getUserId()),new Handler<Either<String, JsonArray>>() {
                        @Override
                        public void handle(Either<String, JsonArray> event) {
                            if (event.isRight()) {
                                List<String> memberIds = new ArrayList<>();
                                for (Object result : ((JsonArray) ((Either.Right) event).getValue()).toList()){
                                    String groupId  = ((Map<String,String>)result).get("groupId");
                                    memberIds.add(groupId);
                                }
                                homeworkService.getAllHomeworksForALesson(user.getUserId(), lessonId, memberIds, arrayResponseHandler(request));
                            } else {
                                badRequest(request,"error when retrieve child gorup");
                            }
                        }
                    });



                            new Handler<HandlerResponse<List<KeyValueModel>>>() {
                        @Override
                        public void handle(HandlerResponse<List<KeyValueModel>> event) {
                            if (event.hasError()){
                                badRequest(request,event.getMessage());
                            }else{
                                List<String> memberIds = new ArrayList<>();
                                for (KeyValueModel group : event.getResult()){
                                    memberIds.add(group.getKey());
                                }

                                //homeworkService.getAllHomeworksForTeacher(user.getUserId(), Arrays.asList(schoolIds), memberIds, startDate, endDate, arrayResponseHandler(request));
                            }

                        }
                    });
                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }*/

    @Get("/homework/:etabIds/:startDate/:endDate/:childId")
    @ApiDoc("Get all homeworks for a school")
    @SecuredAction(value = list_homeworks, type = ActionType.AUTHENTICATED)
    public void listHomeworks(final HttpServerRequest request) {
        final String[] schoolIds = request.params().get("etabIds").split(":");
        final String startDate = request.params().get("startDate");
        final String endDate = request.params().get("endDate");
        final String childId = request.params().get("childId");

        log.debug("listHomeworks on schools : " + schoolIds);

        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(UserInfos user) {
                if (user != null) {
                    switch (user.getType()) {
                        case "Teacher":
                            homeworkService.getAllHomeworksForTeacher(user.getUserId(), Arrays.asList(schoolIds), user.getGroupsIds(), startDate, endDate, arrayResponseHandler(request));
                            break;
                        case "Student":
                            homeworkService.getAllHomeworksForStudent(user.getUserId(), Arrays.asList(schoolIds), user.getGroupsIds(), startDate, endDate, arrayResponseHandler(request));
                            break;
                        case "Relative":
                            final List<String> memberIds = new ArrayList<>();
                            memberIds.add(childId); // little trick to search for the lessons the child can access.
                            if (user.getGroupsIds() != null) {
                                memberIds.addAll(user.getGroupsIds());
                            }
                            homeworkService.getAllHomeworksForParent(user.getUserId(), childId,Arrays.asList(schoolIds), memberIds, startDate, endDate, arrayResponseHandler(request));
                            break;
                        default:
                            homeworkService.getAllHomeworksForStudent(user.getUserId(), Arrays.asList(schoolIds), user.getGroupsIds(), startDate, endDate, arrayResponseHandler(request));
                            break;
                    }

                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }


    @Get("/homework/external/:etabIds/:startDate/:endDate/:type/:userid")
    @ApiDoc("Get all homeworks for a school")
    @SecuredAction(value = list_homeworks, type = ActionType.AUTHENTICATED)
    public void listExternalHomeworks(final HttpServerRequest request) {

        final String[] schoolIds = request.params().get("etabIds").split(":");
        final String startDate = request.params().get("startDate");
        final String endDate = request.params().get("endDate");
        final String type = request.params().get("type");
        final String id = request.params().get("userid");



        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    switch (type) {
                        case "teacher":
                            List<String> memberIds = new ArrayList<>();
                            memberIds.add(id);
                            homeworkService.getAllHomeworksForExternal(id, Arrays.asList(schoolIds), memberIds, startDate, endDate, arrayResponseHandler(request));
                            break;
                        case "audience":
                            diaryService.listGroupsFromClassId(schoolIds[0], id, new Handler<HandlerResponse<List<KeyValueModel>>>() {
                                @Override
                                public void handle(HandlerResponse<List<KeyValueModel>> event) {
                                    if (event.hasError()){
                                        badRequest(request,event.getMessage());
                                    }else{
                                        List<String> memberIds = new ArrayList<>();
                                        for (KeyValueModel group : event.getResult()){
                                            memberIds.add(group.getKey());
                                        }
                                        homeworkService.getAllHomeworksForStudent(user.getUserId(), Arrays.asList(schoolIds), memberIds, startDate, endDate, arrayResponseHandler(request));
                                    }

                                }
                            });
                            break;
                }

                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }


    @Post("/homework")
    @ApiDoc("Create a homework")
    @SecuredAction("diary.createFreeHomework")
    public void createFreeHomework(final HttpServerRequest request) {

        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    RequestUtils.bodyToJson(request, pathPrefix + "createHomework", new Handler<JsonObject>() {
                        @Override
                        public void handle(JsonObject json) {
                            if (user.getStructures().contains(json.getString("school_id", ""))) {
                                final Audience audience = new Audience(json);
                                homeworkService.createHomework(json, user.getUserId(), user.getUsername(), audience, new Handler<Either<String, JsonObject>>() {
                                    @Override
                                    public void handle(Either<String, JsonObject> event) {
                                        if (event.isRight()) {
                                            final JsonObject result = event.right().getValue();
                                            //create automatic sharing
                                            final String resourceId = String.valueOf(result.getLong("id"));

                                            if (!StringUtils.isEmpty(audience.getId())) {
                                                sharedService.shareResource(user.getUserId(), audience.getId(), resourceId, audience.isGroup(),
                                                        actionsForAutomaticSharing, new Handler<Either<String, JsonObject>>() {
                                                            @Override
                                                            public void handle(Either<String, JsonObject> event) {
                                                                if (event.isRight()) {
                                                                    Renders.renderJson(request, result);
                                                                } else {
                                                                    Renders.renderError(request);
                                                                }
                                                            }
                                                        });
                                            } else {
                                                log.error("Sharing Homework has encountered a problem.");
                                                leftToResponse(request, event.left());
                                            }

                                        } else {
                                            log.error("Homework could not be created.");
                                            leftToResponse(request, event.left());
                                        }
                                    }
                                });
                            } else {
                                badRequest(request, "Invalid school identifier.");
                            }
                        }
                    });
                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }

    @Post("/homework/:lessonId")
    @ApiDoc("Create a homework for a lesson")
    @SecuredAction("createHomeworkForLesson")
    public void createHomeworkForLesson(final HttpServerRequest request) {
        final String lessonId = request.params().get("lessonId");

        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    lessonService.retrieveLesson(lessonId, new Handler<Either<String, JsonObject>>() {
                        @Override
                        public void handle(Either<String, JsonObject> event) {
                            if (event.isRight()) {
                                RequestUtils.bodyToJson(request, pathPrefix + "createHomework", new Handler<JsonObject>() {
                                    @Override
                                    public void handle(JsonObject json) {
                                        if (user.getStructures().contains(json.getString("school_id", ""))) {
                                            homeworkService.createHomework(json, user.getUserId(), user.getUsername(), new Audience(json), notEmptyResponseHandler(request, 201));
                                        } else {
                                            badRequest(request, "Invalid school identifier.");
                                        }
                                    }
                                });
                            } else {
                                badRequest(request, "Lesson identifier is unknown.");
                            }
                        }
                    });
                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }

    @Put("/homework/:id")
    @ApiDoc("Modify a homework")
    @SecuredAction(value = manage_resource, type = ActionType.RESOURCE)
    @ResourceFilter(HomeworkAccessFilter.class)
    public void modifyHomework(final HttpServerRequest request) {

        final String homeworkId = request.params().get("id");

        if (isValidHomeworkId(homeworkId)) {
            UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
                @Override
                public void handle(final UserInfos user) {
                    if (user != null) {
                        RequestUtils.bodyToJson(request, pathPrefix + "updateHomework", new Handler<JsonObject>() {
                            @Override
                            public void handle(final JsonObject json) {
                                final Audience newAudience = new Audience(json);
                                audienceService.getOrCreateAudience(newAudience, new Handler<Either<String, JsonObject>>() {

                                    @Override
                                    public void handle(Either<String, JsonObject> event) {
                                        if (event.isRight()) {
                                            //Not sharing updating
                                            if (json.getInteger("lesson_id") != null) {
                                                homeworkService.updateHomework(homeworkId, json, notEmptyResponseHandler(request, 201)); } else {
                                                //free homework
                                                homeworkService.retrieveHomework(homeworkId, new Handler<Either<String, JsonObject>>() {
                                                    @Override
                                                    public void handle(Either<String, JsonObject> eOldHomework) {
                                                        if (eOldHomework.isRight()) {
                                                            final Audience oldAudience = new Audience(eOldHomework.right().getValue());
                                                            homeworkService.updateHomework(homeworkId, json, new Handler<Either<String, JsonObject>>() {
                                                                @Override
                                                                public void handle(Either<String, JsonObject> event) {
                                                                    if (event.isRight()) {
                                                                        final JsonObject result = event.right().getValue();

                                                                        if (!StringUtils.isEmpty(newAudience.getId())) {
                                                                            sharedService.updateShareResource(oldAudience.getId(), newAudience.getId(), homeworkId,
                                                                                    oldAudience.isGroup(), newAudience.isGroup(), actionsForAutomaticSharing, new Handler<Either<String, JsonObject>>() {
                                                                                        @Override
                                                                                        public void handle(Either<String, JsonObject> event) {
                                                                                            if (event.isRight()) {
                                                                                                Renders.renderJson(request, result);
                                                                                            } else {
                                                                                                Renders.renderError(request);
                                                                                            }
                                                                                        }
                                                                                    });
                                                                        } else {
                                                                            log.warn("Sharing Lesson has encountered a problem.");
                                                                            badRequest(request, "Sharing Lesson has encountered a problem.");
                                                                        }
                                                                    } else {
                                                                        log.error("Homework could not be updated.");
                                                                        leftToResponse(request, event.left());
                                                                    }
                                                                }
                                                            });
                                                        } else {
                                                            leftToResponse(request, eOldHomework.left());
                                                        }
                                                    }
                                                });
                                            }
                                        } else {
                                            final String errorMsg = "Could not create audience.";
                                            log.error(errorMsg);
                                            badRequest(request, errorMsg);
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        log.debug("User not found in session.");
                        unauthorized(request, "No user found in session.");
                    }
                }
            });
        } else {
            badRequest(request, "Invalid homework identifier.");
        }
    }

    @Delete("/homework/:id")
    @ApiDoc("Delete a homework")
    @SecuredAction(value = manage_resource, type = ActionType.RESOURCE)
    @ResourceFilter(HomeworkAccessFilter.class)
    public void deleteHomework(final HttpServerRequest request) {

        final String homeworkId = request.params().get("id");

        if (isValidHomeworkId(homeworkId)) {
            UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
                @Override
                public void handle(final UserInfos user) {
                    if (user != null) {
                        homeworkService.deleteHomework(homeworkId, notEmptyResponseHandler(request, 201));
                    } else {
                        log.debug("User not found in session.");
                        unauthorized(request, "No user found in session.");
                    }
                }
            });
        } else {
            badRequest(request, "Invalid homework identifier.");
        }
    }

    //TODO : change action.type to resource + add filter
    @Post("/unPublishHomeworks")
    @ApiDoc("Unpublishes homeworks")
    @SecuredAction(value = publish_resource, type = ActionType.AUTHENTICATED)
    public void unPublishHomeworks(final HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    RequestUtils.bodyToJson(request, pathPrefix + "unPublishHomeworks", new Handler<JsonObject>() {
                        public void handle(JsonObject data) {
                            final List<Integer> ids = data.getArray("ids").toList();

                            homeworkService.unPublishHomeworks(ids, new Handler<Either<String, JsonObject>>() {
                                @Override
                                public void handle(Either<String, JsonObject> event) {
                                    if (event.isRight()) {
                                        request.response().setStatusCode(200).end();
                                    } else {
                                        leftToResponse(request, event.left());
                                    }
                                }
                            });
                        }
                    });
                } else {
                    if (log.isDebugEnabled()) {
                        log.debug("User not found in session.");
                    }
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }

    //TODO : change action.type to resource + add filter
    @Post("/publishHomeworks")
    @ApiDoc("Publishes homeworks")
    @SecuredAction(value = publish_resource, type = ActionType.AUTHENTICATED)
    public void publishHomeworks(final HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    RequestUtils.bodyToJson(request, pathPrefix + "publishHomeworks", new Handler<JsonObject>() {
                        public void handle(JsonObject data) {
                            final List<Integer> ids = data.getArray("ids").toList();

                            homeworkService.publishHomeworks(ids, new Handler<Either<String, JsonObject>>() {
                                @Override
                                public void handle(Either<String, JsonObject> event) {
                                    if (event.isRight()) {
                                        request.response().setStatusCode(200).end();
                                    } else {
                                        leftToResponse(request, event.left());
                                    }
                                }
                            });
                        }
                    });
                } else {
                    if (log.isDebugEnabled()) {
                        log.debug("User not found in session.");
                    }
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }

    @Get("/homework/share/json/:id")
    @ApiDoc("List rights for a given resource")
    @SecuredAction(value = manage_resource, type = ActionType.RESOURCE)
    @ResourceFilter(HomeworkAccessFilter.class)
    public void share(final HttpServerRequest request) {
        super.shareJson(request, false);
    }

    @Put("/homework/share/json/:id")
    @ApiDoc("Add rights for a given resource")
    @SecuredAction(value = manage_resource, type = ActionType.RESOURCE)
    @ResourceFilter(HomeworkAccessFilter.class)
    public void shareSubmit(final HttpServerRequest request) {
        super.shareJsonSubmit(request, null, false);
    }

    @Put("/homework/share/remove/:id")
    @ApiDoc("Remove rights for a given resource")
    @SecuredAction(value = manage_resource, type = ActionType.RESOURCE)
    @ResourceFilter(HomeworkAccessFilter.class)
    public void shareRemove(final HttpServerRequest request) {
        super.removeShare(request, false);
    }

    /**
     * Controls that the homeworkId is a not null number entry.
     */
    private boolean isValidHomeworkId(String homeworkId) {
        return homeworkId != null && homeworkId.matches("\\d+");
    }

    //TODO : change action.type to resource + add filter
    @Delete("/deleteHomeworks")
    @SecuredAction(value = manage_resource, type = ActionType.AUTHENTICATED)
    public void deletes(final HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    RequestUtils.bodyToJson(request, pathPrefix + "deleteHomeworks", new Handler<JsonObject>() {
                        public void handle(JsonObject data) {
                            final List<String> ids = data.getArray("ids").toList();

                            homeworkService.deleteHomeworks(ids, notEmptyResponseHandler(request, 201));
                        }
                    });
                } else {
                    if (log.isDebugEnabled()) {
                        log.debug("User not found in session.");
                    }
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }

    protected List<String> getActionsForAutomaticSharing() {
        return this.actionsForAutomaticSharing;
    }

    @Get("/homeworktype/initorlist")
    @ApiDoc("Get or create homework types for current logged in user and its associated structures")
    @SecuredAction(value = list_homework_types, type = ActionType.AUTHENTICATED)
    public void getOrCreateHomeworkTypes(final HttpServerRequest request) {

        UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
            @Override
            public void handle(final UserInfos user) {
                if (user != null) {
                    homeworkService.listHomeworkTypes(user.getStructures(), new Handler<Either<String, JsonArray>>() {
                        @Override
                        public void handle(Either<String, JsonArray> event) {
                            if (event.isRight()) {
                                final JsonArray result = event.right().getValue();

                                // no homework type found need to autocreate them for teacher users
                                // TODO check num of homework types match number of structures
                                if (event.right().getValue().size() == 0 && "Teacher".equals(user.getType())) {
                                    homeworkService.initHomeworkTypes(user.getStructures(), new Handler<Either<String, JsonObject>>() {
                                        @Override
                                        public void handle(Either<String, JsonObject> event) {
                                            if (event.isRight()) {
                                                created(request);
                                            } else {
                                                Renders.renderError(request);
                                            }
                                        }
                                    });
                                    request.response().setStatusCode(200).end();
                                } else {
                                    Renders.renderJson(request, result);
                                }
                            } else {
                                log.error("Subjects could not be retrieved");
                                leftToResponse(request, event.left());
                            }
                        }
                    });
                } else {
                    unauthorized(request, "No user found in session.");
                }
            }
        });
    }


    @Get("/homework/load/:currentDate/:audienceId")
    @ApiDoc("Get homeworks load (count by day) for current week of specified homework")
    @SecuredAction(value = list_homeworks_load, type = ActionType.AUTHENTICATED)
    public void getHomeworkLoad(final HttpServerRequest request) {

        // date in YYYY-MM-dd format
        final String currentDateFormatted = request.params().get("currentDate");
        final String audienceId = request.params().get("audienceId");

        try {
            UserUtils.getUserInfos(eb, request, new Handler<UserInfos>() {
                @Override
                public void handle(final UserInfos user) {
                    if (user != null) {
                        homeworkService.getHomeworksLoad(currentDateFormatted, audienceId, new Handler<Either<String, JsonArray>>() {
                            @Override
                            public void handle(Either<String, JsonArray> event) {
                                if (event.isRight()) {
                                    final JsonArray result = event.right().getValue();
                                    Renders.renderJson(request, result);
                                } else {
                                    log.info("Homeworks load could not be retrieved.");
                                    leftToResponse(request, event.left());
                                }
                            }
                        });
                    } else {
                        unauthorized(request, "No user found in session.");
                    }
                }
            });
        } catch (NumberFormatException e) {
            badRequest(request, "Could not retrive homework load for week with date " + currentDateFormatted);
        }
    }
}
