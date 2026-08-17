#!/bin/bash
# 認可テスト: 2チーム作成し、越境アクセスが 403、自チームは 200 になることを確認
U=${U:-http://localhost:5000}
J='content-type: application/json'
S=$(date +%s)
pass=0; fail=0
chk(){ # name expected actual
  if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "  ok   $1 ($3)"; else fail=$((fail+1)); echo "  FAIL $1 expected=$2 got=$3"; fi; }
code(){ curl -s -o /dev/null -w "%{http_code}" "$@"; }

# 未ログイン
chk "unauth GET /api/schedules" 401 $(code $U/api/schedules)
chk "unauth GET /api/students" 401 $(code $U/api/students)
chk "public GET /api/sports" 200 $(code $U/api/sports)

# チーム A / B 作成（cookie 保存）
curl -s -c a.jar -X POST $U/api/teams/register -H "$J" -d "{\"clubName\":\"A$S\",\"address\":\"x\",\"sport\":\"サッカー\",\"ownerName\":\"A A\",\"ownerEmail\":\"a$S@example.com\",\"password\":\"Pass1234!\"}" > a.json
curl -s -c b.jar -X POST $U/api/teams/register -H "$J" -d "{\"clubName\":\"B$S\",\"address\":\"x\",\"sport\":\"サッカー\",\"ownerName\":\"B B\",\"ownerEmail\":\"b$S@example.com\",\"password\":\"Pass1234!\"}" > b.json
TA=$(python3 -c "import json;print(json.load(open('a.json'))['team']['id'])"); TB=$(python3 -c "import json;print(json.load(open('b.json'))['team']['id'])")
CA=$(python3 -c "import json;print(json.load(open('a.json'))['team']['teamCode'])")
CB=$(python3 -c "import json;print(json.load(open('b.json'))['team']['teamCode'])")
COACHB=$(python3 -c "import json;print(json.load(open('b.json'))['team']['ownerCoachId'])")
echo "teamA=$TA teamB=$TB"

# コーチAでログインし直し（cookie）
curl -s -c a.jar -X POST $U/api/coach/login -H "$J" -d "{\"email\":\"a$S@example.com\",\"password\":\"Pass1234!\"}" -o /dev/null
chk "coachA me" 200 $(code -b a.jar $U/api/auth/me)
chk "coachA own team" 200 $(code -b a.jar $U/api/teams/$TA)
chk "coachA other team" 403 $(code -b a.jar $U/api/teams/$TB)
chk "coachA list teams (own only)" 1 $(curl -s -b a.jar $U/api/teams | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
chk "coachA students?teamId=B" 403 $(code -b a.jar "$U/api/students?teamId=$TB")
chk "coachA students?teamId=A" 200 $(code -b a.jar "$U/api/students?teamId=$TA")
chk "coachA POST venue for B" 403 $(code -b a.jar -X POST $U/api/venues -H "$J" -d "{\"teamId\":\"$TB\",\"name\":\"x\",\"address\":\"y\"}")
chk "coachA POST venue for A" 201 $(code -b a.jar -X POST $U/api/venues -H "$J" -d "{\"teamId\":\"$TA\",\"name\":\"x\",\"address\":\"y\"}")
chk "coachA GET coachB" 403 $(code -b a.jar $U/api/coach/$COACHB)
chk "coachA admin stats" 403 $(code -b a.jar $U/api/admin/stats)
chk "coachA cleanup-old" 403 $(code -b a.jar -X POST $U/api/schedules/cleanup-old)

# スケジュール: A が作成、B が取得/更新できない
SID=$(curl -s -b a.jar -X POST $U/api/schedules -H "$J" -d "{\"teamId\":\"$TA\",\"title\":\"練習\",\"date\":\"2026-09-01\",\"startTime\":\"10:00\",\"endTime\":\"12:00\",\"categoryIds\":[]}" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('schedule',d).get('id',''))" 2>/dev/null)
echo "schedule=$SID"
curl -s -c b.jar -X POST $U/api/coach/login -H "$J" -d "{\"email\":\"b$S@example.com\",\"password\":\"Pass1234!\"}" -o /dev/null
chk "coachB PUT scheduleA" 403 $(code -b b.jar -X PUT $U/api/schedules/$SID -H "$J" -d '{"title":"hack"}')
chk "coachB DELETE scheduleA" 403 $(code -b b.jar -X DELETE $U/api/schedules/$SID)
chk "coachA PUT scheduleA" 200 $(code -b a.jar -X PUT $U/api/schedules/$SID -H "$J" -d "{\"teamId\":\"$TA\",\"title\":\"練習2\",\"date\":\"2026-09-01\",\"startTime\":\"10:00\",\"endTime\":\"12:00\"}")
chk "coachB list schedules = 0" 0 $(curl -s -b b.jar $U/api/schedules | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
chk "coachA list schedules = 1" 1 $(curl -s -b a.jar $U/api/schedules | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")

# 選手: チームAに登録
curl -s -c s.jar -X POST $U/api/student/register -H "$J" -d "{\"lastName\":\"選\",\"firstName\":\"手\",\"email\":\"s$S@example.com\",\"password\":\"Pass1234!\",\"teamCode\":\"$CA\"}" > s.json; head -c 200 s.json; echo
SIDT=$(python3 -c "import json;print(json.load(open('s.json'))['student']['id'])" 2>/dev/null)
chk "student me" 200 $(code -b s.jar $U/api/auth/me)
chk "student own profile" 200 $(code -b s.jar $U/api/student/$SIDT)
chk "student team A" 200 $(code -b s.jar $U/api/teams/$TA)
chk "student team B" 403 $(code -b s.jar $U/api/teams/$TB)
chk "student list students (coach only)" 403 $(code -b s.jar "$U/api/students?teamId=$TA")
chk "student POST schedule" 403 $(code -b s.jar -X POST $U/api/schedules -H "$J" -d "{\"teamId\":\"$TA\",\"title\":\"x\",\"date\":\"2026-09-02\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}")
chk "student GET schedules" 200 $(code -b s.jar $U/api/schedules)
chk "student attendance own" 200 $(code -b s.jar $U/api/student/$SIDT/attendance)
chk "coachA GET studentA" 200 $(code -b a.jar $U/api/student/$SIDT)
chk "coachB GET studentA" 403 $(code -b b.jar $U/api/student/$SIDT)
chk "student private upload" 403 $(code -b s.jar -X POST $U/api/objects/upload)
chk "student public upload" 200 $(code -b s.jar -X POST $U/api/objects/upload-public)

# ログアウト
curl -s -b a.jar -c a.jar -X POST $U/api/auth/logout -o /dev/null
chk "coachA after logout" 401 $(code -b a.jar $U/api/schedules)

echo "PASS=$pass FAIL=$fail"
