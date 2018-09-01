package graph

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func Test_parseSprint(t *testing.T) {
	goodSprint := "com.atlassian.greenhopper.service.sprint.Sprint@6468cb83[id=287,rapidViewId=71,state=ACTIVE,name=2018.09.03,goal=,startDate=2018-08-21T15:13:59.909Z,endDate=2018-09-04T13:00:00.000Z,completeDate=<null>,sequence=281]"
	spr, err := parseSprint(goodSprint)
	assert.NoError(t, err)
	expected := sprint{
		ID:        287,
		State:     "ACTIVE",
		Name:      "2018.09.03",
		StartDate: time.Date(2018, 8, 21, 15, 13, 59, int(909*time.Millisecond), time.UTC),
		EndDate:   time.Date(2018, 9, 4, 13, 0, 0, 0, time.UTC),
		Sequence:  281,
	}
	assert.Equal(t, expected, spr)
}
