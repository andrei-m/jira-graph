package graph

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func Test_parseSprint(t *testing.T) {
	t.Run("good sprint", func(t *testing.T) {
		raw := "com.atlassian.greenhopper.service.sprint.Sprint@6468cb83[id=287,rapidViewId=71,state=ACTIVE,name=2018.09.03,goal=,startDate=2018-08-21T15:13:59.909Z,endDate=2018-09-04T13:00:00.000Z,completeDate=<null>,sequence=281]"
		spr, err := parseSprint(raw)
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
	})

	t.Run("cloud JIRA sprint", func(t *testing.T) {
		raw := `{"id":80,"name":"native JIRA sprint json","state":"closed","boardId":1,"foo":"arbitrary extra field","startDate":"2021-10-12T15:20:44.479Z","endDate":"2021-10-25T04:00:00.000Z","completeDate":"2021-10-25T14:06:51.325Z"}`
		spr, err := parseSprint(raw)
		assert.NoError(t, err)
		expected := sprint{
			ID:        80,
			State:     "closed",
			Name:      "native JIRA sprint json",
			StartDate: time.Date(2021, 10, 12, 15, 20, 44, int(479*time.Millisecond), time.UTC),
			EndDate:   time.Date(2021, 10, 25, 4, 0, 0, 0, time.UTC),
			Sequence:  0,
		}
		assert.Equal(t, expected, spr)
	})

	t.Run("null dates", func(t *testing.T) {
		raw := "com.atlassian.greenhopper.service.sprint.Sprint@153f4085[id=288,rapidViewId=243,state=FUTURE,name=Alf 9/17 planning,goal=,startDate=<null>,endDate=<null>,completeDate=<null>,sequence=287]"
		spr, err := parseSprint(raw)
		assert.NoError(t, err)
		expected := sprint{
			ID:        288,
			State:     "FUTURE",
			Name:      "Alf 9/17 planning",
			StartDate: time.Time{},
			EndDate:   time.Time{},
			Sequence:  287,
		}
		assert.Equal(t, expected, spr)
	})
}
