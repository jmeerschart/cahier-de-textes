(function() {
    'use strict';

    /*
     * Lesson service as class
     * used to manipulate Lesson model
     */
    class LessonService {


        constructor($http, $q, constants,UtilsService,AttachementService) {
            this.$http = $http;
            this.$q = $q;
            this.constants = constants;
            this.UtilsService=UtilsService;
            this.AttachementService=AttachementService;
        }

        getLessons(userStructuresIds,mondayOfWeek,isUserParent,childId, fromDate, toDate) {

            var start = moment(mondayOfWeek).day(1).format(this.constants.CAL_DATE_PATTERN);
            var end = moment(mondayOfWeek).day(1).add(1, 'week').format(this.constants.CAL_DATE_PATTERN);

            if (fromDate){
              start = fromDate.format(this.constants.CAL_DATE_PATTERN);
              end = toDate.format(this.constants.CAL_DATE_PATTERN);
            }

            var urlGetLessons = `/diary/lesson/${userStructuresIds}/${start}/${end}/`;

            if (isUserParent && childId) {
                urlGetLessons += childId;
            } else {
                urlGetLessons += '%20';
            }

            return this.$http.get(urlGetLessons).then((result)=>{
                return this.mappLessons(result.data);
            });
        }

        getOtherLessons(userStructuresIds,mondayOfWeek,teacher,audience, fromDate, toDate) {

            var start = moment(mondayOfWeek).day(1).format(this.constants.CAL_DATE_PATTERN);
            var end = moment(mondayOfWeek).day(1).add(1, 'week').format(this.constants.CAL_DATE_PATTERN);
            if (fromDate){
              start = fromDate.format(this.constants.CAL_DATE_PATTERN);
              end = toDate.format(this.constants.CAL_DATE_PATTERN);
            }
            let type = teacher ? "teacher" : "audience";
            let id = teacher ? teacher.key : audience.key;

            var urlGetLessons = `/diary/lesson/external/${userStructuresIds}/${start}/${end}/${type}/${id}`;

            return this.$http.get(urlGetLessons).then((result)=>{
                return this.mappLessons(result.data);
            });
        }

        /*
        *   Map lesson
        */
        mappLessons(lessons){
            return _.map(lessons,(lessonData) =>{
                return this.mapLesson(lessonData);
            });
        }

        /*
        *  Map one lesson
        */
        mapLesson(lessonData){
            var lessonHomeworks = [];

            // only initialize homeworks attached to lesson
            // with only id
            if (lessonData.homework_ids) {
                for (var i = 0; i < lessonData.homework_ids.length; i++) {
                    var homework = new Homework();
                    homework.id = lessonData.homework_ids[i];
                    homework.lesson_id = parseInt(lessonData.lesson_id);
                    homework.loaded = false; // means full lessonData from sql not loaded
                    lessonHomeworks.push(homework);
                }
            }

            var lesson =  {
                //for share directive you must have _id
                _id:  lessonData.lesson_id,
                id: lessonData.lesson_id,
                title: lessonData.lesson_title,
                audience: model.audiences.findWhere({id: lessonData.audience_id}),
                audienceId: lessonData.audience_id,
                audienceLabel: lessonData.audience_label,
                audienceType: lessonData.audience_type,
                description: lessonData.lesson_description,
                subject: model.subjects.findWhere({id: lessonData.subject_id}),
                subjectId: lessonData.subject_id,
                subjectLabel: lessonData.subject_label,
                teacherName: lessonData.teacher_display_name,
                structureId: lessonData.school_id,
                date: moment(lessonData.lesson_date),
                startTime: lessonData.lesson_start_time,
                endTime: lessonData.lesson_end_time,
                color: lessonData.lesson_color,
                room: lessonData.lesson_room,
                annotations: lessonData.lesson_annotation,
                startMoment: moment(lessonData.lesson_date.split(' ')[0] + ' ' + lessonData.lesson_start_time),
                endMoment: moment(lessonData.lesson_date.split(' ')[0] + ' ' + lessonData.lesson_end_time),
                state: lessonData.lesson_state,
                is_periodic: false,
                homeworks: lessonHomeworks,
                tooltipText: '',
                locked: (!model.canEdit()) ? true : lessonData.locked
            };
            lesson.subject = new Subject();
            lesson.subject.label = lessonData.subject_label;
            lesson.subject.id = lessonData.subject_id;
            lesson.subject.teacher_id = lessonData.teacher_display_name;

            if('group' === lesson.audienceType){
                lesson.audienceTypeLabel = lang.translate('diary.audience.group');
            } else {
                lesson.audienceTypeLabel = lang.translate('diary.audience.class');
            }

            if (lessonData.attachments) {
                lesson.attachments = AttachementService.mappAttachement(JSON.parse(lessonData.attachments));
            }

            lesson.tooltipText = this.UtilsService.getResponsiveLessonTooltipText(lesson);
            return lesson;
        }



    }
    /* create singleton */
    AngularExtensions.addModuleConfig(function(module) {
        module.service("LessonService", LessonService);
    });

})();
