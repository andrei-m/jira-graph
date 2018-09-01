package graph

import "testing"

func Test_parseSprint(t *testing.T) {
	goodSprint := "com.atlassian.greenhopper.service.sprint.Sprint@6468cb83[id=287,rapidViewId=71,state=ACTIVE,name=2018.09.03,goal=,startDate=2018-08-21T15:13:59.909Z,endDate=2018-09-04T13:00:00.000Z,completeDate=<null>,sequence=281]"
	spr, err := parseSprint(goodSprint)
	if err != nil {
		t.Error(err)
	}
	if spr.ID != 287 {
		t.Fail()
	}
}
