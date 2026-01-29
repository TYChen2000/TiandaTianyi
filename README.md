# 围棋培训管理小程序 v1

> 原生微信小程序 + CloudBase 云开发（老师端 / 家长端）

## 功能概览
- 老师端：班级选择、课程日历、课程记录（出勤 / 星级 / 评语 / 课后要求 / 奖励）、学生历史记录
- 家长端：孩子信息、班级与时间、最近一次课程反馈、历史课程记录、奖励累计

## 云数据库集合设计（建议）

### users
```json
{
  "_id": "user_xxx",
  "openid": "微信openid",
  "role": "teacher" | "parent",
  "name": "姓名",
  "childId": "students._id (家长)",
  "classIds": ["classes._id"]
}
```

### classes
```json
{
  "_id": "class_xxx",
  "name": "围棋启蒙班",
  "teacherId": "users._id",
  "scheduleTime": "每周六 10:00-11:30",
  "scheduleSummary": "每周六",
  "students": ["students._id"]
}
```

### students
```json
{
  "_id": "student_xxx",
  "name": "小明",
  "classId": "classes._id",
  "rewardTotal": 12
}
```

### lessons
```json
{
  "_id": "lesson_xxx",
  "classId": "classes._id",
  "date": "2024-04-18",
  "time": "10:00-11:30",
  "topic": "打劫练习",
  "studentRecords": [
    {
      "studentId": "students._id",
      "attendance": "出勤",
      "rating": "2星",
      "comment": "对杀节奏不错",
      "requirements": ["复盘", "打谱"],
      "reward": 2
    }
  ]
}
```

## 使用说明
1. 在微信开发者工具中打开项目，补充 `app.js` 内的 `env`（云环境 ID）。
2. 在云数据库创建上述集合和文档。
3. 部署云函数 `api`。
4. 使用不同身份的微信号登录并在 `users` 中绑定 `role`。

## 权限说明
所有数据读取/写入必须通过云函数校验用户角色与班级归属，前端不进行敏感权限判断。
