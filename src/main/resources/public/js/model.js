function Homework() {

}

Homework.prototype.api = {
    put: '/diary/homework/:id',
    delete: '/diary/homework/:id',
    post: '/diary/homework'
};

function Attachment(){}
function Subject() { }
function Classroom() { }
function StudentGroup() { }
function HomeworkType(){}

function Lesson(data) {
    this.collection(Attachment);
    this.collection(Homework);
    this.subject = new Subject();
    this.classroom = new Classroom();
}

Lesson.prototype.api = {
    put: '/diary/lesson/:id',
    delete: '/diary/lesson/:id',
    post: '/diary/lesson'
};

Lesson.prototype.toJSON = function () {
    return {
        lesson_title: this.title,
        subject_code: this.subject.code,
        subject_label: this.subject.label,
        school_id: this.classroom.structureId,
        audience_type: this.audienceType,
        audience_code: this.classroom.id,
        audience_label: this.classroom.name,
        lesson_date: this.date.format('YYYY-MM-DD'),
        lesson_start_time: this.startTime.format('HH:mm'),
        lesson_end_time: this.endTime.format('HH:mm'),
        lesson_description: this.description,
        lesson_annotation: this.annotations,
        lesson_room: this.room,
        lesson_color: this.color
    }
};

Lesson.prototype.addHomework = function () {
    var homework = new Homework();
    homework.dueDate = this.date;
    homework.type = model.homeworkTypes.first();
    this.homeworks.push(homework);
};

model.build = function () {
    model.makeModels([HomeworkType, Classroom, Subject, Lesson, Homework]);

    this.collection(Lesson, {
        sync: function () {
            var lessons = [];
            var start = moment(model.calendar.dayForWeek).day(1).format('YYYY-MM-DD');
            var end = moment(model.calendar.dayForWeek).day(1).add(1, 'week').format('YYYY-MM-DD')
            model.me.structures.forEach(function (structureId) {
                http().get('/diary/lesson/' + structureId + '/' + start + '/' + end).done(function (data) {
                    lessons = lessons.concat(data);
                });
            });

            this.load(lessons);
        }
    });

    this.collection(Subject, {
        sync: function () {
            this.load([
                { label: 'test', code: 'test' }
            ]);
        }
    });

    this.collection(Classroom, {
        sync: function () {
            this.all = [];
            var nbStructures = model.me.structures.length;
            var that = this;
            model.me.structures.forEach(function (structureId) {
                http().get('/userbook/structure/' + structureId).done(function (structureData) {
                    structureData.classes = _.map(structureData.classes, function (classroom) {
                        classroom.structureId = structureId;
                        return classroom;
                    });
                    this.addRange(structureData.classes);
                    nbStructures--;
                    if (nbStructures === 0) {
                        this.trigger('sync');
                        this.trigger('change');
                    }
                }.bind(that));
            });
        }
    });

    this.collection(HomeworkType, {
        sync: function () {
            this.load([
                { id: 1, label: lang.translate('homework.type.home') }
            ]);
        }
    })
}

model.on('calendar.date-change', function(){ model.lessons.sync() })
