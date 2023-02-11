import React from 'react';
import {
    render
} from 'react-dom';
import {
    BrowserRouter,
    Routes,
    Route,
    Outlet,
} from 'react-router-dom';
import {
    IssueList
} from './IssueList';
import {
    RoutedIssueGraph
} from './Graph';
import {
    NotFound
} from './Errors';

render(
    <BrowserRouter>
        <Routes>
            <Route path='/' element={<IssueList />} />
            <Route path='/index.html' element={<IssueList />} />
            <Route path='issues' element={
                <main>
                  <Outlet />
                </main>
            }>
                <Route path=':issueKey' element={<RoutedIssueGraph />} />
            </Route>
            <Route path='*' element={<NotFound />} />
        </Routes>
    </BrowserRouter>,
    document.getElementById('root')
);